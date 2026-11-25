// GET /api/admin/session -> { ok: true } when signed in. Signed out, the guard answers 404 before this runs.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { ok: true }
})
