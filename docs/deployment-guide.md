# Deployment guide: Aiven + Prisma + Vercel (Nuxt)

How this portfolio is deployed, and the same steps written so you can reuse them for the next project. Everything here was done for real on this site, including the things that went wrong the first time (see [Troubleshooting](#10-troubleshooting)).

**Contents**
1. [The stack and the mental model](#1-the-stack-and-the-mental-model)
2. [Aiven PostgreSQL](#2-aiven-postgresql)
3. [Prisma 7 setup](#3-prisma-7-setup)
4. [Migrations, including production](#4-migrations-including-production)
5. [Vercel](#5-vercel)
6. [Secrets](#6-secrets)
7. [Cloudinary](#7-cloudinary)
8. [Go-live runbook and live checks](#8-go-live-runbook-and-live-checks)
9. [Day-to-day operations](#9-day-to-day-operations)
10. [Troubleshooting](#10-troubleshooting)
11. [Checklist for a new project](#11-checklist-for-a-new-project)
12. [Quick reference](#12-quick-reference)

---

## 1. The stack and the mental model

| Part | What it does here |
|---|---|
| Nuxt 4 on **Vercel** | Serves the site. Cached pages come from Vercel's CDN; a function (Nitro) renders pages on a cache miss and runs the API |
| **Aiven** PostgreSQL | The database |
| **Prisma 7** (`pg` adapter) | How the code talks to the database; migrations create the tables |
| **Cloudinary** | Image storage and delivery |
| **GitHub** | The code. Vercel deploys from it |

### Environments: keep them straight

This project has **two databases**, and mixing them up caused the only production incident so far.

| | Test / development | Production |
|---|---|---|
| Where the code runs | Your computer (`npm run dev`) | Vercel (Production deployment from `main`) |
| Database | Aiven **test** service | Aiven **production** service |
| Where its settings live | `.env` on your computer | Vercel, Settings, Environment Variables (Production) |
| Tables created by | `npx prisma migrate deploy` run on your computer | the **same command**, run on your computer, pointed at production (section 4) |

Rules that follow from this:
1. A new database is **empty**. Its tables appear only when you apply the migrations to it. Vercel never does that for you.
2. `.env` is for local work. Vercel never reads it. Vercel has its own list of variables.
3. Before running anything that changes a database, check **which** database it targets.

### Build-time versus runtime variables
- **Runtime** variables are read while the site runs (database, Cloudinary, admin, session). Changing one needs a **redeploy** to take effect, because running deployments keep the values they started with.
- **Build-time** variables are used while building. In this project `REVALIDATE_TOKEN` (written into the cache configuration) and `NUXT_PUBLIC_SITE_URL` (baked into the static About page) must exist **at build and at runtime**. Change either and you must redeploy.

---

## 2. Aiven PostgreSQL

### Create the service
1. In the Aiven console, **Create service**, choose **PostgreSQL**.
2. Pick the **cloud and region** first, because everything else depends on it: choose the one closest to where your Vercel function will run (section 5.5). For this project: DigitalOcean, Bangalore (`blr1`), paired with Vercel `bom1` (Mumbai).
3. Pick a plan. I believe Aiven's free plan can power a service off when idle, but I have not verified it, so read the plan's current terms before relying on it for something live. With ISR, visitors keep getting cached pages, but the admin and cache refreshes need the database awake.
4. Wait until the service shows **Running**.

### One service per environment
Use a **separate service for production** (and another for test). Do not point a local `.env` at the production database. Then a slip on your computer cannot touch live data.

### One database per project
A service starts with a database called `defaultdb`. If one service hosts several projects, give each its own database (Aiven console, the service's **Databases** tab, or `CREATE DATABASE`), so projects cannot see each other's tables. Prisma also supports one PostgreSQL *schema* per project inside a database (`?schema=name` on the URL); both approaches work, separate databases are simpler to reason about.

### What you copy from Aiven
In the service overview, **Connection information**:
- the **Service URI**, which becomes `DATABASE_URL`. It looks like `postgres://avnadmin:<password>@<host>:<port>/defaultdb?sslmode=require`
- the **CA certificate** (download it), which becomes `DATABASE_CA_CERT` (paste the whole PEM text, `-----BEGIN CERTIFICATE-----` to `-----END CERTIFICATE-----`)

### TLS and the CA certificate
Aiven signs each project's certificate with its own certificate authority, which Node does not know. The driver treats `sslmode=require` as "verify the certificate", so without the CA the connection fails (`SELF_SIGNED_CERT_IN_CHAIN`). `server/utils/dbConfig.ts` passes the CA to the driver and removes the URL's SSL parameters so they cannot override it. **Never turn certificate checking off** to make an error go away. (`prisma migrate deploy` uses its own connection and does not need the CA.)

### Network settings
- **IP allow-list**: leave it **Open to all**. Vercel functions do not have fixed IP addresses, so a short list would lock the site out. The connection is protected by TLS plus the password. Aiven shows a warning icon for "Open to all", which is expected. (Only restrict it if you add Vercel's paid static IPs.)
- **Connection limit**: every running function instance opens at most **one** connection (`max: 1` in `dbConfig.ts`), but Vercel can run many instances at once, and each Aiven plan has a connection limit. If you ever see "too many connections", turn on **Connection pooling** in Aiven and use the pooler's connection string as `DATABASE_URL` (then test the site).

### Backups and maintenance
- Backups are automatic on Aiven's plans (this project's service showed a backup taken minutes after creation). Know where **Backups** are listed and how to **restore/fork**, before you need it.
- The **maintenance window** (for example Mondays after 08:14 UTC) can restart the database briefly. Cached pages keep working; the admin may fail for a moment, and retrying works.

---

## 3. Prisma 7 setup

What the project contains, which you can copy to a new project:

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Tables. The generator writes the client to `server/generated/prisma`. The connection URL is **not** here (Prisma 7) |
| `prisma.config.ts` | Tells the Prisma command line where the schema and migrations are and which URL to use. It loads `.env` for local commands but **never overrides a variable that is already set**, which is what makes the one-off production command in section 4 safe |
| `server/utils/dbConfig.ts` | Pool settings (1 connection, timeouts), the CA handling, safe error descriptions that hide the URI, host, user and password |
| `server/utils/db.ts` | The one Prisma client, created on first use, never at import. It reads `DATABASE_URL` and the CA from `process.env` at request time |
| `package.json` | `"postinstall": "nuxt prepare && prisma generate"` so the client exists after every install (including on Vercel). `prisma` is a normal dependency for that reason. `"engines": { "node": ">=22.18.0" }` |
| `.gitattributes` | Keeps migration `.sql` files on LF line endings (Prisma checks them byte for byte, and Windows would turn them into CRLF) |

Secrets are read from `process.env` at request time and **not** put in Nuxt's `runtimeConfig`, because a value copied into `runtimeConfig` at build time can end up in the build output.

---

## 4. Migrations, including production

A migration is a folder under `prisma/migrations/<timestamp>_<name>/migration.sql`. Prisma records which ones a database has already received in a table called `_prisma_migrations`, so running the command twice is safe.

### 4.1 Changing the schema (local work)
1. Edit `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name what_changed` against your **test** database. This writes the new migration folder and applies it to the test database. (It needs a "shadow database", a scratch database Prisma creates and drops itself. The default Aiven admin user should be allowed to do that; if your database user is not, set `shadowDatabaseUrl` in `prisma.config.ts`, and check Prisma's documentation for your version.)
3. Run `npm test` and try the change locally.
4. **Commit the new migration folder**, then push.

For a database that exists but was created without migrations, see 4.6.

### 4.2 Applying migrations to production (the safe way)

> **Do this on your own computer. Do not let an assistant, a CI job or a script you have not read run it for you.** It changes live data. Never put the production URL into `.env`.

1. **Make sure the migration is committed** and is the version you want.
2. **Take or confirm a backup** (Aiven console, Backups). For a first migration on an empty database this is optional; for any change to a database with data, do it.
3. In **PowerShell**, in the project folder:

   ```powershell
   $env:DATABASE_URL = Read-Host "Paste the PRODUCTION DATABASE_URL"
   npx prisma migrate deploy
   Remove-Item Env:DATABASE_URL
   ```

   In bash (macOS, Linux, Git Bash) use:

   ```bash
   read -rs -p "Paste the PRODUCTION DATABASE_URL: " DATABASE_URL; echo
   export DATABASE_URL
   npx prisma migrate deploy
   unset DATABASE_URL
   ```

   Why this way: the variable exists only in that one terminal and only for that command, `.env` is never touched, and `Read-Host`/`read -s` keep the connection string out of the shell history. `prisma.config.ts` does not override a variable that is already set, so the command really uses the production URL.
4. **Read the line Prisma prints before it applies anything**:

   ```
   Datasource "db": PostgreSQL database "defaultdb", schema "public" at "<host>:<port>"
   ```

   Confirm the **host** is the production service's host (it appears in the Aiven console). If it is the test host, stop.
5. A successful run ends with `All migrations have been successfully applied.` Check with `npx prisma migrate status` (same environment variable trick) which should say `Database schema is up to date!`.
6. Check the live site: `/api/health` must say `{"database":"up"}` (a `"tables":"missing"` answer means the migration did not reach the database the site uses).

### 4.3 Order of operations when you deploy a change that needs a migration
1. Make the change **backwards compatible** if the site is live (see 4.4).
2. Apply the migration to **production first** (4.2).
3. **Then** deploy the code that uses it (push to `main`).

If you deploy the code first, the live site breaks until the migration is applied. The reverse order is safe when the migration only adds things.

### 4.4 Changes that are safe, and ones that are not
Safe on a live database: adding a table, adding a column that is optional or has a default, adding an index.

Risky, so do it in steps (the "expand and contract" pattern):
- **Renaming or removing a column**: add the new column, deploy code that writes both, copy the old data, deploy code that reads only the new one, then drop the old column in a later migration.
- **Making a column required** when rows exist: add it as optional, fill it, then make it required.
- Anything that drops data: back up first, and read the generated SQL (`migration.sql`) before applying it.

### 4.5 When something goes wrong
- **There are no automatic "down" migrations.** To undo a change, write a new migration that reverses it, or restore the backup (Aiven can fork or restore a backup into a new service; switch `DATABASE_URL` over after checking it).
- **`P3009` / a failed migration**: a migration stopped half way. Look at the SQL error, fix the database by hand or restore, then tell Prisma what happened with `npx prisma migrate resolve --applied <name>` (it was actually applied) or `--rolled-back <name>` (it was undone), and run `migrate deploy` again.
- **"The migration was modified after it was applied"** (a checksum error): somebody edited an applied migration, or its line endings changed. Never edit an applied migration; make a new one. The `.gitattributes` file prevents the line-ending case.
- **`P2021` ("The table does not exist")** at runtime: the database the site uses lacks the tables. Apply the migrations to **that** database (4.2).
- **Connection errors during `migrate deploy`**: check the URL, that the service is Running and that the allow-list is open.

### 4.6 Putting Prisma on a database that already has tables
Create the first migration from the current schema, then mark it as already applied instead of running it: `npx prisma migrate resolve --applied <name>`. This is called baselining; read Prisma's "baselining" documentation before doing it on a database with real data.

### 4.7 Never do these on production
`prisma migrate dev`, `prisma migrate reset`, `prisma db push` and `prisma db pull --force` are for development databases. `reset` **deletes everything**. The production command is only ever `migrate deploy`.

---

## 5. Vercel

### 5.1 Connect the project
1. Vercel, **Add New, Project**, import the GitHub repository.
2. **Framework Preset: Nuxt.js.** This matters: a project that was created for something else (this one was a Vite app) keeps its old preset, and a "Vite" preset runs `vite build` and looks for a `dist` folder, so the build fails. In **Settings, Build and Deployment** set the preset to Nuxt.js and make sure the Build Command, Output Directory and Install Command **Override** switches are off.
3. **Node.js Version**: 22.x or newer (Settings, General).
4. There should be no `vercel.json` that rewrites everything to `index.html` (the old single-page app had one; it breaks Nuxt).

### 5.2 Which branch deploys where
- Pushing to the **production branch** (`main`) creates a **Production** deployment on your main domain.
- Pushing any other branch creates a **Preview** deployment on its own URL.
- Environment variables are scoped: **Production**, **Preview**, **Development**. Variables set for Production only are **not** available to Previews, so a Preview shows an error page and the admin cannot sign in. That is intended. If you want working previews, add Preview variables that point at a **test** database, never production.

### 5.3 Environment variables
Settings, **Environment Variables**, tick **Production**, and mark the secrets **Sensitive** (their values can then never be read back, only replaced).

| Variable | Value | Build-time? |
|---|---|---|
| `DATABASE_URL` | the **production** Aiven URI, ending `?sslmode=require` | no |
| `DATABASE_CA_CERT` | the Aiven CA certificate, whole PEM block | no |
| `CLOUDINARY_URL` | `cloudinary://<api_key>:<api_secret>@<cloud_name>` | no |
| `CLOUDINARY_FOLDER` | the folder name (keep it the same as when the images were uploaded) | no |
| `ADMIN_EMAIL` | the admin's email | no |
| `ADMIN_PASSWORD_HASH` | from `npm run hash-password` (a fresh one for production) | no |
| `SESSION_SECRET` | 32+ random characters, new for production | no |
| `REVALIDATE_TOKEN` | 32+ random characters | **yes** |
| `NUXT_PUBLIC_SITE_URL` | `https://your-domain` (no trailing slash) | **yes** |

Notes:
- **Which database?** `DATABASE_URL` here must be the **production** one, and that database must have its tables (section 4.2).
- **Changing a variable does nothing to a running deployment.** After adding or editing any variable, **redeploy** (Deployments, the latest one, Redeploy).
- Pasting a multi-line value (the certificate) into Vercel keeps the line breaks. Do not add quotes.
- You cannot read a Sensitive value back. To "check" it, delete it and add it again from your source of truth.

### 5.4 ISR and instant cache refresh
Home and project pages use Vercel **ISR**: cached for 60 seconds, then rebuilt in the background. The admin also triggers a rebuild of the affected pages right after a save, by requesting them with the header `x-prerender-revalidate: <REVALIDATE_TOKEN>`. The token is written into the ISR configuration **at build time**, so it must already exist when the build runs. To verify after a deploy: edit a title in the admin, save, and reload Home within a few seconds. If the change only appears after about a minute, the token was missing at build time (add it and redeploy). The response header `X-Vercel-Cache` shows `HIT`, `MISS`, `STALE` or `REVALIDATED`.

### 5.5 Function region
Visitors are served from cache around the world, but the admin, the first load of a page and every cache refresh run in a function that talks to the database. Put the function **next to the database**: Settings, **Functions**, **Function Region**, then redeploy.

| Database region | Vercel region |
|---|---|
| Mumbai, Bangalore, Delhi (India) | `bom1` (Mumbai) |
| Singapore | `sin1` |
| Tokyo | `hnd1` |
| Seoul | `icn1` |
| Hong Kong | `hkg1` |
| Sydney | `syd1` |
| Frankfurt | `fra1` |
| London | `lhr1` |
| Ireland | `dub1` |
| US East (N. Virginia) | `iad1` |
| US West (Oregon) | `pdx1` |

If your city is not in Vercel's list, choose the closest one. Every database query pays the distance, so this setting is worth the minute it takes.

### 5.6 Custom domain
1. Settings, **Domains**, add the domain and set the DNS records Vercel shows.
2. Set `NUXT_PUBLIC_SITE_URL` to `https://your-domain` and **redeploy**. The static About page bakes the address into its canonical link and share preview at build time.
3. In Google Search Console, add the site and submit `https://your-domain/sitemap.xml`.

### 5.7 Logs, and rolling back
- **Logs**: the project's **Logs** tab (or the "View logs" link on an error page) shows each request and its errors. Filter by status code. For a crash, open the failing request and read the first error line. Runtime errors here are what pinpointed the missing-tables problem.
- **Instant Rollback**: Deployments, pick a previous good deployment, **Instant Rollback**. It takes effect at once and does not rebuild. Use it first, investigate second. Note that a rollback does not undo database changes.
- A **failed build never replaces** the live site: the previous successful deployment keeps serving.

---

## 6. Secrets

### Rules
- `.env` is in `.gitignore`. Only `.env.example` (empty values) is committed.
- Never paste a secret into a chat, an issue, a screenshot or a commit message. Aiven passwords, the Cloudinary API secret, `SESSION_SECRET`, `REVALIDATE_TOKEN` and the admin password hash are secrets.
- Use **different** values for production than for development: the session secret, the admin password hash, and the database.
- Never put the production `DATABASE_URL` in the local `.env`.

### Generating values
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # SESSION_SECRET, REVALIDATE_TOKEN
npm run hash-password                                                          # ADMIN_PASSWORD_HASH (asks for the password, hidden)
```

### Checking nothing leaked
Before the first deploy, and after big changes, search the build output and the repository for your real secret values. This project did it with a small script that reads the values from the environment, searches every file, and prints only the secret's *name* and the file, never the value. Test any such scanner by planting a known value first, otherwise "found nothing" proves nothing. Also check what the browser receives: the `window.__NUXT__.config` object in the page source should contain only public values.

### If a secret leaks
| Secret | What to do |
|---|---|
| Database password | Aiven console: reset the password (or rotate the user), update `DATABASE_URL` everywhere, redeploy |
| Cloudinary API secret | Cloudinary dashboard: regenerate the API secret, update `CLOUDINARY_URL`, redeploy |
| `SESSION_SECRET` | Change it and redeploy. Every admin session is signed out |
| Admin password | `npm run hash-password`, update `ADMIN_PASSWORD_HASH`, redeploy |
| `REVALIDATE_TOKEN` | Change it and redeploy (low risk: it only lets someone refresh your cache) |

If something was committed to git, rotating the secret is what protects you; deleting the commit does not.

---

## 7. Cloudinary

- Use **one folder per project** (`CLOUDINARY_FOLDER`), so projects sharing an account do not mix.
- This project uploads **directly from the browser** with a short-lived signature from an admin-only endpoint (Vercel limits request bodies to about 4.5 MB). The signature covers folder, allowed formats and timestamp. Only `cloudName` and `apiKey` go to the browser, never the secret.
- The 10 MB limit is enforced in the browser only. Cloudinary cannot enforce it on a signed upload, so set a maximum file size in your Cloudinary account if you need a hard limit.
- Do not change `CLOUDINARY_FOLDER` after images are saved: the server accepts only images inside that folder, so saved images would be rejected on the next save.
- Test and production can share one Cloudinary account if they use different folders, which is cleaner than sharing a folder.

---

## 8. Go-live runbook and live checks

Order of work for a first deployment:
1. **Production database** created and Running (section 2). Note its region.
2. **Apply the migrations to production** (4.2). `migrate status` says "up to date".
3. **Vercel project**: repository connected, Framework Preset Nuxt.js, Node 22+, function region next to the database.
4. **Environment variables** (5.3) added for Production, secrets Sensitive.
5. **Deploy** (push to `main`, or Redeploy).
6. **Live checks** below.
7. Custom domain (5.6) and Search Console.

### Live checks (replace `$SITE` with your address)
```bash
curl -s $SITE/api/health                      # {"database":"up"}   (503 with "tables":"missing" = migration not applied to this database)
curl -s -o /dev/null -w "%{http_code}\n" $SITE/                  # 200
curl -s -o /dev/null -w "%{http_code}\n" $SITE/about             # 200
curl -s -o /dev/null -w "%{http_code}\n" $SITE/projects/nope     # 404
curl -s -o /dev/null -w "%{http_code}\n" $SITE/admin             # 404 (signed out)
curl -s -o /dev/null -w "%{http_code}\n" $SITE/api/admin/projects   # 404 (signed out)
curl -s $SITE/robots.txt                      # Disallow: /admin, Disallow: /api/, and a Sitemap line with your address
curl -s $SITE/sitemap.xml                     # lists published projects
curl -s $SITE/about | grep -o '<link rel="canonical"[^>]*>'      # your address, no "//" in it
curl -sI $SITE/ | grep -iE "x-vercel-cache|content-security-policy|strict-transport"
```
Then in a browser:
- Sign in at `/admin/login`. A wrong password shows an error, and the sixth wrong try within a minute is refused.
- Create a project with a cover and gallery images, reorder, remove one (check it disappears from Cloudinary), publish.
- Edit a title, save, reload Home within seconds (proves `REVALIDATE_TOKEN`).
- Paste a project link into a chat app to see the share preview.
- Run Lighthouse on Home, About and a project page.

---

## 9. Day-to-day operations

| Task | How |
|---|---|
| Ship a code change | Commit, push to `main`, watch the deployment finish, run the live checks |
| Ship a change that needs a migration | Section 4.3: migrate production first, then push |
| Change an environment variable | Edit it in Vercel, then **Redeploy** |
| Rotate the admin password | `npm run hash-password`, update `ADMIN_PASSWORD_HASH`, redeploy |
| Sign everyone out | Change `SESSION_SECRET`, redeploy |
| Roll back a bad deploy | Vercel Deployments, Instant Rollback |
| Restore data | Aiven backups (fork/restore into a new service, check, then switch `DATABASE_URL`) |
| Check health | `curl $SITE/api/health` |
| Audit dependencies | `npm audit` now and then. At the time of writing it reports two advisories, both in build tooling that is not deployed |

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Vercel page `503 FUNCTION_INVOCATION_FAILED` on Home | The function failed. On this project: the production database had **no tables** | Read the Vercel Logs. If it says `The table public.Project does not exist` (Prisma `P2021`), apply the migrations to the production database (4.2) |
| `/api/health` returns `{"database":"up","tables":"missing"}` | Connected to a database that has no tables | Apply the migrations to the database in `DATABASE_URL` (4.2) |
| `/api/health` returns `{"database":"down"}` | Cannot connect. The log line `[health] database unreachable: code=...` says why (next rows) | See the codes below |
| Code `DB_CA_INVALID`, `SELF_SIGNED_CERT_IN_CHAIN`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | `DATABASE_CA_CERT` missing or malformed | Paste the whole certificate again, no quotes. Do not disable certificate checks |
| Code `ENOTFOUND` | Wrong host in `DATABASE_URL` | Copy the URI from Aiven again |
| Code `28P01` | Wrong password | Copy the URI again (or reset the password in Aiven and update it) |
| Code `ETIMEDOUT` or `ECONNREFUSED` | Service powered off, still starting, wrong port, or allow-list blocking | Check the service is Running; the allow-list should be Open to all |
| `DATABASE_URL is not set` in logs | The variable is not available to this deployment (wrong scope, or added after the deploy) | Tick Production, then redeploy |
| Build fails mentioning `vite` | Vercel Framework Preset is still "Vite" | Set it to Nuxt.js and switch off the Overrides (5.1) |
| Build succeeds but the site is the old one | The build failed, so the previous deployment is still live | Open the failed deployment's build log |
| Preview deployment shows an error | Variables are Production-only | Add Preview variables pointing at a test database |
| Links contain `//` (`.com//about`) | `NUXT_PUBLIC_SITE_URL` ends with `/` | Remove the slash. (This project's code now tolerates it) |
| Canonical shows `localhost` or `*.vercel.app` | `NUXT_PUBLIC_SITE_URL` not set at build time | Set it, redeploy |
| Edits take about a minute to appear | `REVALIDATE_TOKEN` missing at build time | Set it, redeploy |
| Admin sign-in says "temporarily unavailable" | The login attempts cannot be recorded (database unreachable or no tables) | Fix the database first |
| Admin sign-in says "Too many attempts" | 5 wrong tries in a minute | Wait a minute |
| Saving a project says an image "was not uploaded through the editor" | `CLOUDINARY_FOLDER` changed since the image was uploaded | Restore the folder name, or upload the image again |
| Migration error: "was modified after it was applied" | A migration file changed, or its line endings changed | Restore it from git; make a new migration for changes; check `.gitattributes` |
| Images do not load | Content Security Policy blocks another image host | Cloudinary (`res.cloudinary.com`) is allowed; add other hosts to the policy in `nuxt.config.ts` |
| A Windows command cannot delete `.output` (`EBUSY`) | A program (or a shell sitting inside that folder) still holds it | Close it, or move your terminal out of the folder |

---

## 11. Checklist for a new project

Copy this list into the new project's notes and tick it off.

**Accounts and services**
- [ ] GitHub repository created, `.env` in `.gitignore`, `.env.example` committed
- [ ] Aiven: a **test** PostgreSQL service and a **production** one (or one service with a database each), regions chosen near the Vercel region
- [ ] Aiven: note each service's CA certificate and connection URI
- [ ] Cloudinary account (or a new folder name for this project)
- [ ] Vercel account connected to GitHub

**Code (this repository is a working template)**
- [ ] Copy the database setup: `prisma.config.ts`, `server/utils/db.ts`, `server/utils/dbConfig.ts`, the `postinstall` script, the `prisma` dependencies pinned to the same version, `.gitattributes`
- [ ] Define the schema, create the first migration on the **test** database (`migrate dev`), commit `prisma/migrations`
- [ ] If there is an admin: copy `server/middleware/admin-guard.ts`, `server/utils/{adminPaths,session,password,login,loginAttemptStore}.ts`, `scripts/hash-password.mjs`, and the `LoginAttempt` model
- [ ] A health route that checks a real table (`server/api/health.get.ts`), so a wrong or empty database is visible
- [ ] Never read secrets through `runtimeConfig`; read `process.env` at request time
- [ ] `npm test` passes, and the end-to-end test can start the server without a database

**Production database**
- [ ] Create the production database
- [ ] **Apply the migrations to it** with the safe command (4.2) and check the printed host
- [ ] `migrate status` says up to date

**Vercel**
- [ ] Import the repo, **Framework Preset Nuxt.js**, no overrides, Node 22+
- [ ] Function region next to the database (5.5)
- [ ] Environment variables for Production (5.3), secrets Sensitive, new production secrets
- [ ] Remove old `vercel.json` rewrites from a previous framework
- [ ] Deploy and run the live checks (section 8)
- [ ] Custom domain, then set `NUXT_PUBLIC_SITE_URL` and redeploy

**After launch**
- [ ] Verify the instant cache refresh, the 404s for signed-out admin, and Lighthouse
- [ ] Note the production service's maintenance window and backup location
- [ ] Put the project's specifics in its README, and keep this guide next to it

---

## 12. Quick reference

**Commands**

| Command | Use |
|---|---|
| `npx prisma migrate deploy` | Apply committed migrations to the database in `DATABASE_URL` (the production command) |
| `npx prisma migrate status` | Show which migrations the database has |
| `npx prisma migrate dev --name x` | Create and apply a migration on a **development** database |
| `npx prisma migrate resolve --applied <name>` / `--rolled-back <name>` | Repair the record after a manual fix or a failed migration |
| `npx prisma generate` | Rebuild the client (runs automatically on install) |
| `npm run hash-password` | Create an admin password hash |
| `npm test` / `npm run typecheck` / `npm run build` | Check the code |

**Prisma and database error codes**

| Code | Meaning |
|---|---|
| `P2021` | A table does not exist in this database (migration not applied) |
| `P2002` | A unique value already exists (for example a duplicate slug) |
| `P3009` | A migration failed earlier and blocks new ones (see 4.5) |
| `28P01` | Wrong password |
| `ENOTFOUND` | Host name not found |
| `SELF_SIGNED_CERT_IN_CHAIN` | The CA certificate is missing or wrong |

**HTTP checks**

| Answer | Meaning here |
|---|---|
| `200 {"database":"up"}` from `/api/health` | Database reachable and the tables exist |
| `503 {"database":"up","tables":"missing"}` | Wrong database, or migration not applied |
| `503 {"database":"down"}` | Cannot reach the database |
| `404` on `/admin` signed out | Correct: the admin is hidden |
| `X-Vercel-Cache: HIT` / `STALE` / `REVALIDATED` | The page came from cache / was stale / was just refreshed |
