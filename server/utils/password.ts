// Password hashing with Node's built-in scrypt, a random salt, and a timing-safe compare.
// Pure (no Nuxt imports), so `npm run hash-password` and the tests use this same file.
//
// Hash format (no "$", so it survives .env files and dashboards unchanged):
//   scrypt:<N>:<r>:<p>:<salt base64url>:<hash base64url>
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SALT_LENGTH = 16
const DEFAULTS = { N: 32768, r: 8, p: 1 } as const
const MAX_N = 2 ** 17 // refuse absurd cost values from a mistyped environment variable

interface ScryptParams {
  N: number
  r: number
  p: number
}

function derive(password: string, salt: Buffer, { N, r, p }: ScryptParams, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // maxmem must exceed 128 * N * r bytes (Node's default of 32 MB is exactly N=32768, r=8)
    scrypt(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem: 128 * N * r * 2 }, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

/** A new hash for the given password, with a random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await derive(password, salt, DEFAULTS, KEY_LENGTH)
  const { N, r, p } = DEFAULTS
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join(':')
}

function parseHash(stored: string | undefined): { params: ScryptParams, salt: Buffer, key: Buffer } | null {
  if (!stored) return null
  const parts = stored.trim().split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null
  const [N, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
  const valid = [N, r, p].every(Number.isInteger) && N >= 2 && N <= MAX_N && (N & (N - 1)) === 0 && r >= 1 && r <= 16 && p >= 1 && p <= 4
  if (!valid) return null
  const salt = Buffer.from(parts[4]!, 'base64url')
  const key = Buffer.from(parts[5]!, 'base64url')
  if (salt.length < 8 || key.length < 16) return null
  return { params: { N, r, p }, salt, key }
}

// A throwaway hash used when the real one is missing or malformed, so a misconfigured server
// takes about as long to answer as a configured one (it still always returns false).
const DUMMY = parseHash('scrypt:32768:8:1:AAAAAAAAAAAAAAAAAAAAAA:' + Buffer.alloc(KEY_LENGTH).toString('base64url'))!

/** True when `password` matches `stored`. Never throws on a malformed hash; it returns false. */
export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  const parsed = parseHash(stored)
  const target = parsed ?? DUMMY
  const key = await derive(password, target.salt, target.params, target.key.length)
  const equal = key.length === target.key.length && timingSafeEqual(key, target.key)
  return parsed !== null && equal
}
