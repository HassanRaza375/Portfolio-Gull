// The admin session: a signed cookie that holds only an expiry time and an HMAC signature.
// Pure (no Nuxt imports) so the tests can sign and check cookies directly.
//   cookie value = <expiry as unix seconds>.<HMAC-SHA256 of "admin-session:<expiry>", base64url>
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'hg_admin'
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days, in seconds
const MIN_SECRET_LENGTH = 32

/** Sessions only work with a long enough secret; otherwise every check fails closed. */
export const isSecretUsable = (secret: string | undefined): secret is string => typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH

const sign = (expiry: string, secret: string) => createHmac('sha256', secret).update(`admin-session:${expiry}`).digest('base64url')

/** A new cookie value that expires `maxAge` seconds after `now` (unix seconds). */
export function createSessionToken(secret: string | undefined, now = Math.floor(Date.now() / 1000), maxAge = SESSION_MAX_AGE): string {
  if (!isSecretUsable(secret)) throw new Error('SESSION_SECRET is missing or shorter than 32 characters')
  const expiry = String(now + maxAge)
  return `${expiry}.${sign(expiry, secret)}`
}

/** True only for a cookie value with a valid signature that has not expired. */
export function verifySessionToken(token: string | undefined, secret: string | undefined, now = Math.floor(Date.now() / 1000)): boolean {
  if (!token || !isSecretUsable(secret)) return false
  const parts = token.split('.')
  if (parts.length !== 2 || !/^\d{1,12}$/.test(parts[0]!)) return false
  const [expiry, signature] = parts as [string, string]
  const expected = Buffer.from(sign(expiry, secret))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false
  return Number(expiry) > now
}
