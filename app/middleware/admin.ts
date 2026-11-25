// Client-side redirect for admin pages. This is a convenience only: the real check is the server guard (server/middleware/admin-guard.ts),
// which answers 404 to a signed-out request for any admin page or API. This just sends a person whose session ended to the login page.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return // admin pages are not server-rendered (routeRules: ssr false)
  const checked = useState('admin-checked', () => false)
  if (checked.value) return
  try {
    await $fetch('/api/admin/session')
    checked.value = true
  } catch {
    return navigateTo('/admin/login')
  }
})
