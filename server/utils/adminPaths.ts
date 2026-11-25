// Which requests belong to the admin area, and the same-origin check for writes. Pure, so the tests cover the edge cases.

/**
 * The path the way a router would see it: query and hash removed, percent-decoding applied, backslashes and repeated slashes collapsed,
 * "./" and "../" resolved, lower-cased, no trailing slash. vue-router matches paths case-insensitively and without a trailing slash, so the guard has to as well:
 * "/Admin", "//admin", "/%61dmin" and "/admin/../admin" must all count as /admin.
 */
export function normalizePath(raw: string): string {
  let p = raw.split(/[?#]/)[0] ?? ''
  for (let i = 0; i < 3; i++) {
    try {
      p = decodeURIComponent(p)
    } catch {
      /* not valid percent-encoding: keep it as it is */
    }
    p = p.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
    try {
      p = new URL(p, 'http://x.invalid').pathname
    } catch {
      /* keep it as it is */
    }
  }
  p = p.toLowerCase().replace(/\/+$/, '')
  return p || '/'
}

export type AdminSurface = 'page' | 'api'

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

/** 'page' for /admin and below, 'api' for /api/admin and below, null for everything else (the public site). */
export function adminSurface(rawPath: string): AdminSurface | null {
  const path = normalizePath(rawPath)
  if (under(path, '/api/admin')) return 'api'
  if (under(path, '/admin')) return 'page'
  return null
}

/** The only two admin routes a signed-out visitor may reach: the login page and the login request itself. */
export function isPublicAdminRoute(rawPath: string, method: string): boolean {
  const path = normalizePath(rawPath)
  if (path === '/admin/login') return method === 'GET' || method === 'HEAD'
  if (path === '/api/admin/login') return method === 'POST'
  return false
}

export const isWriteMethod = (method: string) => !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())

/**
 * Same-origin check for writes. A browser always sends Origin on a cross-site or same-site POST, so Origin must match the Host header.
 * With no Origin, Sec-Fetch-Site has to say the request came from this site. Anything else is refused.
 */
export function isSameOrigin(h: { origin?: string, host?: string, secFetchSite?: string }): boolean {
  if (h.origin) {
    try {
      return !!h.host && new URL(h.origin).host === h.host
    } catch {
      return false
    }
  }
  return h.secFetchSite === 'same-origin' || h.secFetchSite === 'none'
}
