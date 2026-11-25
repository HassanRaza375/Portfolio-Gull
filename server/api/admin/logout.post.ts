// POST /api/admin/logout -> clears the session cookie. Behind the guard, so a signed-out request gets 404.
import { SESSION_COOKIE } from '../../utils/session'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  deleteCookie(event, SESSION_COOKIE, { path: '/', httpOnly: true, secure: !import.meta.dev, sameSite: 'lax' })
  return { ok: true }
})
