// The pg pool options and a safe description of a connection failure. Pure, so unit tests check them with fake URLs and no database. Never log or return
// the URI, host, user or password.
//
// Why the CA option exists: pg 8.23 treats `sslmode=require` (and prefer, verify-ca) as verify-full, so Node's TLS must trust the server's certificate. Aiven signs it
// with a per-project CA that Node does not ship, so a serverless function failed to connect while `prisma migrate deploy` (which does not verify) worked. And pg merges
// the parsed connection string OVER the options it is given, so an `sslmode` left in the URL would replace our `ssl` option: with a CA set, the SSL parameters are
// removed from the URL. Certificate checks are never turned off (tests/dbConfig.test.ts scans the server folder for that).

export const POOL = { max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10_000 } as const;

/** URL parameters that make pg-connection-string build its own `ssl` value (which would override ours). */
const SSL_PARAMS = ["ssl", "sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"];

export interface PoolConfig {
  connectionString: string;
  ssl?: { ca: string; rejectUnauthorized: true };
  max: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
}

export class DbConfigError extends Error {
  code = "DB_CA_INVALID";
}

/** The bare base64 body of a certificate (what some dashboards copy, with no BEGIN/END lines). */
const BARE_BASE64 = /^[A-Za-z0-9+/=\s]{200,}$/;

/** True when the text IS a certificate (PEM, or its bare base64 body) and not a file path. */
export const looksLikeCertText = (v: string): boolean => /-----BEGIN CERTIFICATE-----/.test(v) || BARE_BASE64.test(v.trim());

/** PEM text as pasted into an environment variable: real newlines, `\n` escapes when the dashboard kept it on one line, or just the base64 body (it is wrapped as PEM). */
export function normaliseCa(ca: string): string {
  const text = ca.includes("\n") ? ca : ca.replace(/\\n/g, "\n");
  const pem = text.replace(/\r\n/g, "\n").trim();
  if (!pem.includes("-----BEGIN") && BARE_BASE64.test(pem)) {
    const body = pem.replace(/\s+/g, "");
    return `-----BEGIN CERTIFICATE-----\n${body.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----\n`;
  }
  return pem + "\n";
}

/** The CA from the environment: `DATABASE_CA_CERT` (the PEM text) or `DATABASE_CA_FILE` (a path, read by `readFile`). Undefined when neither is set. */
export function resolveCa(env: Record<string, string | undefined>, readFile: (path: string) => string): string | undefined {
  if (env.DATABASE_CA_CERT) return env.DATABASE_CA_CERT;
  if (env.DATABASE_CA_FILE) {
    // the certificate itself pasted where a path was expected: accept it (it is verified exactly the same way)
    if (looksLikeCertText(env.DATABASE_CA_FILE)) return env.DATABASE_CA_FILE;
    try {
      return readFile(env.DATABASE_CA_FILE);
    } catch {
      throw new DbConfigError("DATABASE_CA_FILE could not be read");
    }
  }
  return undefined;
}

/** The PostgreSQL schema asked for with `?schema=name` in the URL (Prisma's own convention; keeps the test run apart from other tables in a shared database). Undefined when absent or not a plain identifier. */
export function schemaOf(url: string): string | undefined {
  try {
    const s = new URL(url).searchParams.get("schema");
    return s && /^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(s) ? s : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The options for `new PrismaPg(...)` (they go to pg's Pool). Without a CA: the URL as it is. With one: TLS that trusts exactly that CA and still checks the host name
 * (`rejectUnauthorized: true`), and the URL's SSL parameters removed so they cannot override it.
 */
export function poolConfig(url: string, ca?: string): PoolConfig {
  if (!ca) return { connectionString: url, ...POOL };
  const pem = normaliseCa(ca);
  if (!/-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/.test(pem)) throw new DbConfigError("The database CA is not a PEM certificate");
  const u = new URL(url);
  for (const p of SSL_PARAMS) u.searchParams.delete(p);
  return { connectionString: u.toString(), ssl: { ca: pem, rejectUnauthorized: true }, ...POOL };
}

/** Every form of a secret part of the URL that could appear in a message: as written, decoded, and encoded. */
function secretsOf(url: string | undefined): string[] {
  if (!url) return [];
  const out = new Set<string>([url]);
  try {
    const u = new URL(url);
    // the first label of the host too: a driver message sometimes carries a short form of the host name
    for (const part of [u.hostname, u.hostname.split(".")[0], u.username, u.password, u.host]) {
      if (!part) continue;
      out.add(part);
      try {
        out.add(decodeURIComponent(part));
      } catch {
        /* not encoded */
      }
      out.add(encodeURIComponent(part));
    }
  } catch {
    /* not a URL: the whole string is still removed */
  }
  return [...out].filter((s) => s.length >= 3).sort((a, b) => b.length - a.length);
}

/** The error codes worth logging, from the error and the driver error Prisma wraps (for example SELF_SIGNED_CERT_IN_CHAIN, ENOTFOUND, 28P01). */
function codesOf(err: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<unknown>();
  const walk = (e: unknown, depth: number) => {
    if (!e || typeof e !== "object" || seen.has(e) || depth > 4) return;
    seen.add(e);
    const o = e as Record<string, unknown>;
    for (const k of ["code", "originalCode", "kind", "errno"]) if (typeof o[k] === "string" || typeof o[k] === "number") out.push(String(o[k]));
    walk(o.cause, depth + 1);
    walk((o.meta as Record<string, unknown> | undefined)?.driverAdapterError, depth + 1);
  };
  walk(err, 0);
  return [...new Set(out)];
}

function messagesOf(err: unknown): string[] {
  const out: string[] = [];
  let e: unknown = err;
  for (let i = 0; i < 4 && e; i++) {
    if (e instanceof Error || (typeof e === "object" && e && "message" in e)) out.push(String((e as { message: unknown }).message));
    const o = e as { cause?: unknown; originalMessage?: unknown };
    if (typeof o.originalMessage === "string") out.push(o.originalMessage);
    e = o.cause;
  }
  if (!out.length) out.push(String(err));
  return out;
}

/** One line for the server log: the error codes and the messages with the URI, host, user and password removed (and any other `postgres://` URI, any hosted-database host and any `user@host` pair). Short. */
export function describeDbError(err: unknown, url: string | undefined): string {
  const codes = codesOf(err);
  let msg = [...new Set(messagesOf(err))].join(" | ");
  for (const s of secretsOf(url)) msg = msg.split(s).join("[redacted]");
  msg = msg
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[uri]")
    .replace(/[a-z0-9.-]+\.aivencloud\.com(?::\d+)?/gi, "[host]")
    .replace(/\b[\w.-]+@[\w.-]+\b/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  return `code=${codes.length ? codes.join(",") : "unknown"} message=${msg || "none"}`;
}

/** The server-log line for a failed health check. */
export const dbFailureLine = (err: unknown, url: string | undefined): string => `[health] database unreachable: ${describeDbError(err, url)}`;
