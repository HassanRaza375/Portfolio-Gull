// The login decision: rate limit, credential check, delay after a wrong password. Pure and injectable, so the tests use an in-memory attempt store
// and never touch the database. The route handler passes in the Prisma-backed store (server/utils/loginAttemptStore.ts).
import { createHash, timingSafeEqual } from 'node:crypto'
import { verifyPassword } from './password'

export const LOGIN_LIMIT = 5 // tries per window per address
export const LOGIN_WINDOW_SECONDS = 60

export interface AttemptStore {
  /** Records one attempt for this address and returns how many it has made in the last window, including this one. */
  record: (ip: string) => Promise<number>
  /** Forgets the address's attempts (after a correct login). */
  clear: (ip: string) => Promise<void>
  /** Deletes old rows. */
  prune: () => Promise<void>
}

export interface LoginConfig {
  email: string | undefined
  passwordHash: string | undefined
}

export type LoginResult =
  | { status: 'ok' }
  | { status: 'invalid' }
  | { status: 'limited', retryAfter: number }
  | { status: 'unavailable' }

/** Constant-time string compare (both sides are hashed first, so the lengths always match). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** The wait after a wrong password: 500 ms, plus 250 ms for each earlier try in this window, up to 2 seconds. */
export const wrongPasswordDelay = (attemptsInWindow: number) => Math.min(2000, 500 + 250 * Math.max(0, attemptsInWindow - 1))

export interface LoginDeps {
  store: AttemptStore
  config: LoginConfig
  sleep?: (ms: number) => Promise<void>
}

export async function attemptLogin(input: { ip: string, email: string, password: string }, deps: LoginDeps): Promise<LoginResult> {
  const { store, config } = deps
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))

  let count: number
  try {
    count = await store.record(input.ip)
    // best effort: old rows are removed on the way
    void store.prune().catch(() => {})
  } catch {
    // no way to count tries: refuse to check passwords rather than allow unlimited guessing
    return { status: 'unavailable' }
  }
  if (count > LOGIN_LIMIT) return { status: 'limited', retryAfter: LOGIN_WINDOW_SECONDS }

  // Both checks always run, so a wrong email takes as long as a wrong password.
  const emailOk = !!config.email && safeEqual(input.email.trim().toLowerCase(), config.email.trim().toLowerCase())
  const passwordOk = await verifyPassword(input.password, config.passwordHash)
  if (emailOk && passwordOk) {
    await store.clear(input.ip).catch(() => {})
    return { status: 'ok' }
  }

  await sleep(wrongPasswordDelay(count))
  return { status: 'invalid' }
}
