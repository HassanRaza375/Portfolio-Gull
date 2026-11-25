// End-to-end: starts the real Nuxt dev server with NO database and checks the admin guard over HTTP.
// Admin routes are found by scanning server/api/admin and app/pages/admin, so routes added later are covered without editing this file.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hashPassword } from '../../server/utils/password'
import { createSessionToken, SESSION_COOKIE } from '../../server/utils/session'

const PORT = 3077
const BASE = `http://127.0.0.1:${PORT}`
const SECRET = 'e2e-test-secret-that-is-at-least-32-chars-long'
const OTHER_SECRET = 'a-completely-different-secret-32-characters'
const SAME_ORIGIN = { Origin: BASE }
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

let server: ChildProcess

const get = (path: string, init: RequestInit = {}) => fetch(BASE + path, { redirect: 'manual', ...init })
const asAdmin = (token = createSessionToken(SECRET)) => ({ Cookie: `${SESSION_COOKIE}=${token}` })

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
}

/** "server/api/admin/projects/[id].put.ts" -> { method: "PUT", path: "/api/admin/projects/1" } */
function discoverApiRoutes() {
  return files('server/api/admin').map((f) => {
    const rel = relative('server/api/admin', f).replace(/\\/g, '/').replace(/\.ts$/, '')
    const m = /^(.*?)(?:\.(get|post|put|patch|delete))?$/.exec(rel)!
    const path = m[1]!.replace(/(^|\/)index$/, '').replace(/\[[^\]]+\]/g, '1')
    return { method: (m[2] ?? 'get').toUpperCase(), path: '/api/admin' + (path ? '/' + path : '') }
  })
}

function discoverPages() {
  return files('app/pages/admin')
    .map(f => relative('app/pages/admin', f).replace(/\\/g, '/').replace(/\.vue$/, ''))
    .map(r => r.replace(/(^|\/)index$/, '').replace(/\[[^\]]+\]/g, '1'))
    .filter(r => r !== 'login')
    .map(r => '/admin' + (r ? '/' + r : ''))
}

beforeAll(async () => {
  const hash = await hashPassword('end-to-end-password')
  server = spawn(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'dev', '--port', String(PORT), '--host', '127.0.0.1'], {
    env: {
      ...process.env,
      // no database: signed-out requests never reach it, and login must fail closed
      DATABASE_URL: '',
      DATABASE_CA_CERT: '',
      DATABASE_CA_FILE: '',
      CLOUDINARY_URL: 'cloudinary://123456:fake-secret-value-for-tests@democloud', // fake: nothing is sent to Cloudinary
      CLOUDINARY_FOLDER: 'test-folder',
      NUXT_PUBLIC_SITE_URL: 'https://example.test/', // with a trailing slash on purpose: the site must not produce "//" in its links
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD_HASH: hash,
      SESSION_SECRET: SECRET,
    },
    stdio: 'ignore',
  })
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    try {
      const body = await (await fetch(`${BASE}/api/health`)).text()
      if (body.includes('"database"')) return
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('dev server did not start')
})

afterAll(() => {
  if (!server?.pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  else server.kill('SIGKILL')
})

describe('signed out', () => {
  const pages = discoverPages()
  const apis = discoverApiRoutes().filter(r => !(r.path === '/api/admin/login' && r.method === 'POST'))

  it('finds the admin routes to check', () => {
    expect(pages.length).toBeGreaterThan(0)
    expect(apis.map(r => r.path)).toContain('/api/admin/session')
  })

  it('answers 404 for every admin page', async () => {
    for (const p of [...pages, '/admin/projects/new', '/admin/projects/123']) {
      expect((await get(p)).status, p).toBe(404)
    }
  })

  it('answers 404 for every admin page spelled differently', async () => {
    for (const p of ['/admin/', '/Admin', '/ADMIN/projects/new', '//admin', '/admin//projects', '/%61dmin', '/admin/../admin', '/%2561dmin', '/admin/login/extra', '/admin?x=1']) {
      expect((await get(p)).status, p).toBe(404)
    }
  })

  it('answers 404 for every admin API with every method, with and without a same-origin header', async () => {
    for (const r of [...apis, { method: 'GET', path: '/api/admin/projects' }, { method: 'GET', path: '/api/admin/uploads/sign' }]) {
      for (const method of METHODS) {
        for (const headers of [{}, SAME_ORIGIN]) {
          expect((await get(r.path, { method, headers })).status, `${method} ${r.path}`).toBe(404)
        }
      }
    }
  })

  it('answers GET /api/admin/login with 404 (only POST is open)', async () => {
    expect((await get('/api/admin/login')).status).toBe(404)
  })

  it('gives the same 404 for a real admin API and one that does not exist', async () => {
    const [real, fake] = await Promise.all([get('/api/admin/session'), get('/api/admin/does-not-exist-anywhere')])
    expect(real.status).toBe(404)
    expect(fake.status).toBe(404)
    const pick = async (r: Response) => { const j = await r.json(); return { statusCode: j.statusCode, statusMessage: j.statusMessage } }
    expect(await pick(real)).toEqual(await pick(fake))
  })

  it('rejects a missing, expired, forged or wrongly signed cookie with 404', async () => {
    const good = createSessionToken(SECRET)
    const [expiry, sig] = good.split('.') as [string, string]
    const tokens = [
      '',
      'garbage',
      createSessionToken(SECRET, Math.floor(Date.now() / 1000) - 10_000, 60), // expired
      `${Number(expiry) + 100000}.${sig}`, // longer expiry, old signature
      createSessionToken(OTHER_SECRET), // signed with another secret
    ]
    for (const t of tokens) {
      expect((await get('/api/admin/session', { headers: asAdmin(t) })).status, t).toBe(404)
      expect((await get('/admin', { headers: asAdmin(t) })).status, t).toBe(404)
    }
  })

  it('leaves the login page open and marks it noindex with a header', async () => {
    // Admin pages are client-rendered, so the server HTML has no <meta robots> (the browser adds it with useHead). The header is the server-side signal.
    const res = await get('/admin/login')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('disallows the admin area in robots.txt', async () => {
    const text = await (await get('/robots.txt')).text()
    expect(text).toMatch(/Disallow: \/admin/)
  })
})

// The public site, with NO database: the static About page, SEO tags, the 404s that never need the database, and "no write routes".
describe('public site', () => {
  it('serves About as a complete page with its own title, description, canonical URL and share image', async () => {
    const res = await get('/about')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toMatch(/<title>About · Hafiz Gull<\/title>/)
    expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/)
    expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/about"/)
    expect(html).toMatch(/<meta property="og:image" content="[^"]+\/og\.jpg"/)
    expect(html).toMatch(/<h1[^>]*>About Me<\/h1>/)
    expect(html).toMatch(/<a href="#main"[^>]*>Skip to content<\/a>/)
    expect(html).toMatch(/<main id="main"/)
  })

  it('uses the site address from the environment without doubling its trailing slash', async () => {
    const html = await (await get('/about')).text()
    expect(html).toContain('<link rel="canonical" href="https://example.test/about"')
    expect(html).toContain('<meta property="og:image" content="https://example.test/og.jpg"')
    expect(html).not.toMatch(/https:\/\/example\.test\/\//)
    const robots = await (await get('/robots.txt')).text()
    expect(robots).toContain('Sitemap: https://example.test/sitemap.xml')
  })

  it('generates the footer year', async () => {
    const html = await (await get('/about')).text()
    expect(html).toContain(`Copyright ${new Date().getFullYear()} © Hafiz Gull`)
  })

  it('does not put admin code or links on a public page', async () => {
    const html = await (await get('/about')).text()
    expect(html.toLowerCase()).not.toMatch(/href="\/admin|sign out|uploads\/sign/)
  })

  it('answers a malformed project address with a real 404 page that is kept out of search, without touching the database', async () => {
    const page = await get('/projects/NOT_A_SLUG', { headers: { Accept: 'text/html' } }) // like a browser; without it Nitro answers with JSON
    expect(page.status).toBe(404)
    const html = await page.text()
    expect(html).toContain('Page not found')
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/)
    const api = await get('/api/projects/NOT_A_SLUG')
    expect(api.status).toBe(404)
  })

  it('fails Home loudly (503) instead of caching an empty page when the data is unavailable', async () => {
    expect((await get('/')).status).toBe(503)
  })

  it('has no public write routes', async () => {
    for (const path of ['/api/projects', '/api/projects/some-slug']) {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const status = (await get(path, { method, headers: { 'Content-Type': 'application/json' }, body: '{}' })).status
        expect([404, 405], `${method} ${path} -> ${status}`).toContain(status)
      }
    }
  })

  it('lists the sitemap in robots.txt', async () => {
    const text = await (await get('/robots.txt')).text()
    expect(text).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/)
    expect(text).toMatch(/Disallow: \/api\//)
  })
})

describe('login request', () => {
  const login = (headers: Record<string, string>, body: unknown) =>
    get('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

  it('refuses a cross-site or origin-less request with 403', async () => {
    const body = { email: 'admin@example.com', password: 'whatever' }
    expect((await login({ Origin: 'https://evil.example' }, body)).status).toBe(403)
    expect((await login({}, body)).status).toBe(403)
  })

  it('rejects a malformed body with 400', async () => {
    expect((await login(SAME_ORIGIN, { nope: true })).status).toBe(400)
  })

  it('fails closed (503) when tries cannot be counted, instead of checking passwords with no limit', async () => {
    const res = await login(SAME_ORIGIN, { email: 'admin@example.com', password: 'end-to-end-password' })
    expect(res.status).toBe(503)
    expect(res.headers.get('set-cookie')).toBeNull()
  })
})

describe('signed in', () => {
  it('lets a valid cookie through to the admin API and pages', async () => {
    expect((await get('/api/admin/session', { headers: asAdmin() })).status).toBe(200)
    expect((await get('/admin', { headers: asAdmin() })).status).toBe(200)
  })

  it('still refuses a write without a same-origin header (403)', async () => {
    expect((await get('/api/admin/logout', { method: 'POST', headers: asAdmin() })).status).toBe(403)
    expect((await get('/api/admin/logout', { method: 'POST', headers: { ...asAdmin(), Origin: 'https://evil.example' } })).status).toBe(403)
  })

  const post = (path: string, body: unknown) =>
    get(path, { method: 'POST', headers: { ...asAdmin(), ...SAME_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const put = (path: string, body: unknown) =>
    get(path, { method: 'PUT', headers: { ...asAdmin(), ...SAME_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  it('signs an upload with cloudName and apiKey, and never returns the API secret', async () => {
    const res = await post('/api/admin/uploads/sign', { kind: 'gallery' })
    expect(res.status).toBe(200)
    const text = await res.text()
    const body = JSON.parse(text)
    expect(body).toMatchObject({ cloudName: 'democloud', apiKey: '123456', folder: 'test-folder/gallery', allowedFormats: 'png,jpg,webp' })
    expect(body.signature).toMatch(/^[0-9a-f]{40}$/)
    expect(text).not.toContain('fake-secret-value-for-tests')
  })

  it('refuses to sign for an unknown kind', async () => {
    expect((await post('/api/admin/uploads/sign', { kind: '../../etc' })).status).toBe(400)
    expect((await post('/api/admin/uploads/sign', {})).status).toBe(400)
  })

  it('refuses to discard an image outside our Cloudinary folder', async () => {
    expect((await post('/api/admin/uploads/discard', { publicId: 'someone-elses/image' })).status).toBe(400)
    expect((await post('/api/admin/uploads/discard', { publicId: 'test-folder/../sample' })).status).toBe(400)
  })

  it('answers a bad project body with 422 and a message for each field', async () => {
    const res = await post('/api/admin/projects', { title: '', slug: 'Not A Slug', summary: '', published: true })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(Object.keys(body.data.fieldErrors)).toEqual(expect.arrayContaining(['title', 'slug', 'summary', 'cover']))
  })

  it('refuses images that were not uploaded to our folder, before touching the database', async () => {
    const foreign = { url: 'https://res.cloudinary.com/democloud/image/upload/v1/other-project/cover/x.png', publicId: 'other-project/cover/x', width: 1200, height: 800 }
    const res = await post('/api/admin/projects', { title: 'T', slug: 't', summary: 'S', cover: foreign })
    expect(res.status).toBe(422)
    expect((await res.json()).data.fieldErrors.cover).toMatch(/uploaded through the editor/)
  })

  it('answers 404 with a project_not_found code for a bad project id (so the editor can tell it from a signed-out 404)', async () => {
    const res = await get('/api/admin/projects/abc', { headers: asAdmin() })
    expect(res.status).toBe(404)
    expect((await res.json()).data.code).toBe('project_not_found')
    const badId = await put('/api/admin/projects/0', { title: 'x' }) // the id is checked first
    expect(badId.status).toBe(404)
    expect((await badId.json()).data.code).toBe('project_not_found')
    expect((await put('/api/admin/projects/5', { title: 'x' })).status).toBe(422) // a valid id, then the body is validated before the database is touched
  })

  it('signs out with a same-origin write and clears the cookie', async () => {
    const res = await get('/api/admin/logout', { method: 'POST', headers: { ...asAdmin(), ...SAME_ORIGIN } })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toMatch(new RegExp(`${SESSION_COOKIE}=;`))
  })
})
