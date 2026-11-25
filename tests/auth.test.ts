// Unit tests for the admin auth building blocks. No server and no database: the login logic gets an in-memory attempt store.
import { describe, expect, it } from 'vitest'
import { adminSurface, isPublicAdminRoute, isSameOrigin, normalizePath } from '../server/utils/adminPaths'
import { attemptLogin, LOGIN_LIMIT, wrongPasswordDelay, type AttemptStore } from '../server/utils/login'
import { hashPassword, verifyPassword } from '../server/utils/password'
import { createSessionToken, verifySessionToken } from '../server/utils/session'

const SECRET = 'unit-test-secret-that-is-at-least-32-chars-long'
const PASSWORD = 'correct horse battery staple'

describe('password hashing', () => {
  it('accepts the right password and rejects the wrong one', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(await verifyPassword(PASSWORD, hash)).toBe(true)
    expect(await verifyPassword('wrong password', hash)).toBe(false)
  })

  it('uses a random salt and a format with no "$" or the password in it', async () => {
    const [a, b] = await Promise.all([hashPassword(PASSWORD), hashPassword(PASSWORD)])
    expect(a).not.toBe(b)
    expect(a).not.toContain('$')
    expect(a).not.toContain(PASSWORD)
    expect(a.startsWith('scrypt:')).toBe(true)
  })

  it('returns false for a missing or malformed hash, never throws', async () => {
    expect(await verifyPassword(PASSWORD, undefined)).toBe(false)
    expect(await verifyPassword(PASSWORD, '')).toBe(false)
    expect(await verifyPassword(PASSWORD, 'not-a-hash')).toBe(false)
    expect(await verifyPassword(PASSWORD, 'scrypt:1:1:1:AAAA:BBBB')).toBe(false)
  })
})

describe('session cookie', () => {
  const now = 1_800_000_000

  it('accepts a fresh signed token', () => {
    expect(verifySessionToken(createSessionToken(SECRET, now), SECRET, now + 60)).toBe(true)
  })

  it('rejects an expired token', () => {
    const token = createSessionToken(SECRET, now, 100)
    expect(verifySessionToken(token, SECRET, now + 101)).toBe(false)
  })

  it('rejects a tampered expiry, a wrong signature, another secret, and junk', () => {
    const token = createSessionToken(SECRET, now)
    const [expiry, sig] = token.split('.') as [string, string]
    expect(verifySessionToken(`${Number(expiry) + 99999}.${sig}`, SECRET, now)).toBe(false)
    expect(verifySessionToken(`${expiry}.${sig.slice(0, -2)}xx`, SECRET, now)).toBe(false)
    expect(verifySessionToken(token, 'a-different-secret-that-is-32-characters!', now)).toBe(false)
    for (const junk of [undefined, '', 'abc', '1.2.3', '.', `${expiry}.`, `-5.${sig}`]) {
      expect(verifySessionToken(junk, SECRET, now)).toBe(false)
    }
  })

  it('fails closed when the secret is missing or too short', () => {
    expect(() => createSessionToken(undefined)).toThrow()
    expect(() => createSessionToken('short')).toThrow()
    expect(verifySessionToken(createSessionToken(SECRET, now), undefined, now)).toBe(false)
    expect(verifySessionToken(createSessionToken(SECRET, now), 'short', now)).toBe(false)
  })

  it('holds only an expiry and a signature', () => {
    expect(createSessionToken(SECRET, now)).toMatch(/^\d+\.[A-Za-z0-9_-]+$/)
  })
})

describe('admin path matching', () => {
  const adminPages = ['/admin', '/admin/', '/Admin', '/ADMIN/Projects', '//admin', '/admin//projects', '/%61dmin', '/%41dmin/new', '/admin/../admin', '/x/../admin/projects/1', '\\admin', '/admin?x=1', '/admin#top', '/%2561dmin']
  it.each(adminPages)('treats %s as an admin page', (p) => {
    expect(adminSurface(p)).toBe('page')
  })

  const adminApis = ['/api/admin', '/api/admin/projects', '/API/Admin/x', '/api//admin/x', '/api/%61dmin/x', '/api/admin/../admin/x']
  it.each(adminApis)('treats %s as an admin API', (p) => {
    expect(adminSurface(p)).toBe('api')
  })

  it.each(['/', '/about', '/projects/admin', '/api/projects', '/api/health', '/administrator', '/adminx'])('leaves %s to the public site', (p) => {
    expect(adminSurface(p)).toBeNull()
  })

  it('opens only the login page and the login request', () => {
    expect(isPublicAdminRoute('/admin/login', 'GET')).toBe(true)
    expect(isPublicAdminRoute('/Admin/Login/', 'GET')).toBe(true)
    expect(isPublicAdminRoute('/api/admin/login', 'POST')).toBe(true)
    expect(isPublicAdminRoute('/api/admin/login', 'GET')).toBe(false)
    expect(isPublicAdminRoute('/admin/login/x', 'GET')).toBe(false)
    expect(isPublicAdminRoute('/admin', 'GET')).toBe(false)
    expect(isPublicAdminRoute('/api/admin/session', 'GET')).toBe(false)
  })

  it('normalises paths', () => {
    expect(normalizePath('/Admin//Projects/?a=b#c')).toBe('/admin/projects')
    expect(normalizePath('')).toBe('/')
  })
})

describe('same-origin check', () => {
  it('accepts a matching Origin', () => {
    expect(isSameOrigin({ origin: 'https://example.com', host: 'example.com' })).toBe(true)
  })
  it('refuses a different or malformed Origin', () => {
    expect(isSameOrigin({ origin: 'https://evil.com', host: 'example.com' })).toBe(false)
    expect(isSameOrigin({ origin: 'null', host: 'example.com' })).toBe(false)
    expect(isSameOrigin({ origin: 'https://example.com.evil.com', host: 'example.com' })).toBe(false)
  })
  it('falls back to Sec-Fetch-Site and otherwise refuses', () => {
    expect(isSameOrigin({ host: 'example.com', secFetchSite: 'same-origin' })).toBe(true)
    expect(isSameOrigin({ host: 'example.com', secFetchSite: 'cross-site' })).toBe(false)
    expect(isSameOrigin({ host: 'example.com' })).toBe(false)
  })
})

/** An in-memory stand-in for the LoginAttempt table. */
function memoryStore(): AttemptStore & { counts: Map<string, number> } {
  const counts = new Map<string, number>()
  return {
    counts,
    async record(ip) {
      const n = (counts.get(ip) ?? 0) + 1
      counts.set(ip, n)
      return n
    },
    async clear(ip) {
      counts.delete(ip)
    },
    async prune() {},
  }
}

describe('login', () => {
  const email = 'admin@example.com'
  const setup = async () => {
    const hash = await hashPassword(PASSWORD)
    const delays: number[] = []
    return {
      hash,
      delays,
      store: memoryStore(),
      deps: (store: AttemptStore) => ({ store, config: { email, passwordHash: hash }, sleep: async (ms: number) => void delays.push(ms) }),
    }
  }

  it('accepts the right email and password, ignoring email case and spaces', async () => {
    const t = await setup()
    const r = await attemptLogin({ ip: '1.1.1.1', email: '  Admin@Example.com ', password: PASSWORD }, t.deps(t.store))
    expect(r).toEqual({ status: 'ok' })
    expect(t.delays).toEqual([])
  })

  it('rejects a wrong password with a delay, and a wrong email the same way', async () => {
    const t = await setup()
    expect(await attemptLogin({ ip: '1.1.1.1', email, password: 'nope' }, t.deps(t.store))).toEqual({ status: 'invalid' })
    expect(await attemptLogin({ ip: '1.1.1.1', email: 'other@example.com', password: PASSWORD }, t.deps(t.store))).toEqual({ status: 'invalid' })
    expect(t.delays).toEqual([wrongPasswordDelay(1), wrongPasswordDelay(2)])
    expect(t.delays[0]).toBeGreaterThan(0)
    expect(t.delays[1]!).toBeGreaterThan(t.delays[0]!)
  })

  it('rate limits: after 5 tries in a minute even the correct password is refused', async () => {
    const t = await setup()
    for (let i = 0; i < LOGIN_LIMIT; i++) {
      expect((await attemptLogin({ ip: '2.2.2.2', email, password: 'wrong' }, t.deps(t.store))).status).toBe('invalid')
    }
    const blocked = await attemptLogin({ ip: '2.2.2.2', email, password: PASSWORD }, t.deps(t.store))
    expect(blocked).toEqual({ status: 'limited', retryAfter: 60 })
  })

  it('limits each address on its own', async () => {
    const t = await setup()
    for (let i = 0; i < LOGIN_LIMIT + 1; i++) await attemptLogin({ ip: '3.3.3.3', email, password: 'wrong' }, t.deps(t.store))
    expect((await attemptLogin({ ip: '4.4.4.4', email, password: PASSWORD }, t.deps(t.store))).status).toBe('ok')
  })

  it('forgets earlier failures after a correct login', async () => {
    const t = await setup()
    for (let i = 0; i < 3; i++) await attemptLogin({ ip: '5.5.5.5', email, password: 'wrong' }, t.deps(t.store))
    expect((await attemptLogin({ ip: '5.5.5.5', email, password: PASSWORD }, t.deps(t.store))).status).toBe('ok')
    expect(t.store.counts.has('5.5.5.5')).toBe(false)
  })

  it('refuses to check passwords when the tries cannot be counted', async () => {
    const t = await setup()
    const broken: AttemptStore = { record: async () => { throw new Error('database down') }, clear: async () => {}, prune: async () => {} }
    expect(await attemptLogin({ ip: '6.6.6.6', email, password: PASSWORD }, t.deps(broken))).toEqual({ status: 'unavailable' })
  })

  it('never lets anyone in when the hash or email is not configured', async () => {
    const t = await setup()
    const noHash = { store: t.store, config: { email, passwordHash: undefined }, sleep: async () => {} }
    const noEmail = { store: memoryStore(), config: { email: undefined, passwordHash: t.hash }, sleep: async () => {} }
    expect((await attemptLogin({ ip: '7.7.7.7', email, password: PASSWORD }, noHash)).status).toBe('invalid')
    expect((await attemptLogin({ ip: '7.7.7.7', email: '', password: PASSWORD }, noEmail)).status).toBe('invalid')
  })
})
