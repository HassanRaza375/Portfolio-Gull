// The one guard for the whole admin area: every /admin/** page and every /api/admin/** route.
//   - Signed out: 404 (not 401), so a stranger cannot tell the admin area exists. Only the login page and POST /api/admin/login are open.
//   - Writes (anything but GET/HEAD/OPTIONS) also need the same-origin check.
// The client-side redirect in app/middleware/admin.ts is only a convenience; this is the real check.
import { adminSurface, isPublicAdminRoute, isSameOrigin, isWriteMethod } from '../utils/adminPaths'
import { SESSION_COOKIE, verifySessionToken } from '../utils/session'

const notFound = () => createError({ statusCode: 404, statusMessage: 'Not Found' })

export default defineEventHandler((event) => {
  const surface = adminSurface(event.path)
  if (!surface) return // the public site

  const method = event.method
  const sameOrigin = () => isSameOrigin({
    origin: getRequestHeader(event, 'origin'),
    host: getRequestHeader(event, 'host'),
    secFetchSite: getRequestHeader(event, 'sec-fetch-site'),
  })

  if (isPublicAdminRoute(event.path, method)) {
    // the login request is the one write a signed-out visitor may make; it still needs the same-origin check
    if (surface === 'api' && !sameOrigin()) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    return
  }

  const signedIn = verifySessionToken(getCookie(event, SESSION_COOKIE), process.env.SESSION_SECRET)
  if (!signedIn) throw notFound()

  if (surface === 'api' && isWriteMethod(method) && !sameOrigin()) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
})
