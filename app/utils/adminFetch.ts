// $fetch for the admin API. A signed-out request to /api/admin/* is a 404 (by design), so a 404 that is NOT "project not found" means the
// session ended: send the person to the login page.
interface AdminFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export interface FieldErrorBody {
  data?: { data?: { fieldErrors?: Record<string, string>, code?: string }, message?: string }
  statusCode?: number
}

export async function adminFetch<T>(url: string, options: AdminFetchOptions = {}): Promise<T> {
  try {
    return await ($fetch as (u: string, o: AdminFetchOptions) => Promise<T>)(url, options)
  } catch (e) {
    const err = e as FieldErrorBody
    if (err.statusCode === 404 && err.data?.data?.code !== 'project_not_found') {
      useState('admin-checked').value = false
      await navigateTo('/admin/login')
    }
    throw e
  }
}

/** { fieldName: message } from a 422 response, or {} for any other error. */
export const fieldErrorsFrom = (e: unknown): Record<string, string> => (e as FieldErrorBody).data?.data?.fieldErrors ?? {}

/** Statuses our own routes answer with a message written for the person. Anything else (a 500) can carry internal text, so it is never shown. */
const FRIENDLY_STATUSES = [400, 409, 422, 429, 503]

/** A short message for an error that is not about one field. */
export function messageFrom(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  const err = e as FieldErrorBody
  if (err.statusCode && FRIENDLY_STATUSES.includes(err.statusCode) && err.data?.message) return err.data.message
  if (err.statusCode === 503) return 'A service is temporarily unavailable. Try again shortly.'
  return fallback
}
