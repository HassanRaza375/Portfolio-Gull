// POST /api/admin/login { email, password } -> sets the signed session cookie.
// The guard has already run the same-origin check. Every failure is a generic message so it reveals nothing about which part was wrong.
import { z } from 'zod'
import { attemptLogin } from '../../utils/login'
import { loginAttemptStore } from '../../utils/loginAttemptStore'
import { createSessionToken, isSecretUsable, SESSION_COOKIE, SESSION_MAX_AGE } from '../../utils/session'

const Body = z.object({
  email: z.string().max(254),
  password: z.string().min(1).max(200),
})

/** The visitor's address. On Vercel the platform sets this header and cannot be spoofed by the client. */
function clientIp(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]): string {
  const forwarded = getRequestHeader(event, 'x-vercel-forwarded-for') ?? getRequestHeader(event, 'x-real-ip')
  return forwarded?.split(',')[0]?.trim() || event.node.req.socket.remoteAddress || 'unknown'
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const parsed = Body.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Enter your email and password.' })

  const secret = process.env.SESSION_SECRET
  if (!isSecretUsable(secret) || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH) {
    console.error('[admin] login is not configured: set ADMIN_EMAIL, ADMIN_PASSWORD_HASH and a SESSION_SECRET of 32+ characters')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Invalid email or password.' })
  }

  const result = await attemptLogin(
    { ip: clientIp(event), email: parsed.data.email, password: parsed.data.password },
    { store: loginAttemptStore, config: { email: process.env.ADMIN_EMAIL, passwordHash: process.env.ADMIN_PASSWORD_HASH } },
  )

  if (result.status === 'limited') {
    setResponseHeader(event, 'Retry-After', result.retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests', message: 'Too many attempts. Wait a minute and try again.' })
  }
  if (result.status === 'unavailable') {
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'Sign-in is temporarily unavailable. Try again shortly.' })
  }
  if (result.status === 'invalid') {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Invalid email or password.' })
  }

  setCookie(event, SESSION_COOKIE, createSessionToken(secret), {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return { ok: true }
})
