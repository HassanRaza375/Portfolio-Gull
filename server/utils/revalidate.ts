// Refreshing cached public pages after an admin change.
//
// Home and project pages are cached on Vercel (ISR, set up in step 5). Vercel refreshes a cached page on demand when it is requested
// with the header `x-prerender-revalidate: <bypass token>`. This file sends those requests. With no REVALIDATE_TOKEN (local development, or
// before step 5 is wired up) nothing is sent and the paths are logged instead, so the call sites are in place and testable now.
import { useDb } from './db'
import { describeDbError } from './dbConfig'

/** Pure: the public paths a change can affect. Always Home; the changed project's page(s); and every published project page, because "Next" links depend on the order. */
export function affectedPaths(opts: { slugs?: string[], publishedSlugs: string[] }): string[] {
  const paths = ['/', ...(opts.slugs ?? []).map((s) => `/projects/${s}`), ...opts.publishedSlugs.map((s) => `/projects/${s}`)]
  return [...new Set(paths)]
}

export interface RevalidateDeps {
  token: string | undefined
  origin: string
  fetch: (url: string, init: { headers: Record<string, string>, signal: AbortSignal }) => Promise<{ ok: boolean, status: number }>
  log: (line: string) => void
}

/** Sends the revalidation requests (in parallel, 8 seconds at most). Never throws. Returns the paths that failed. */
export async function revalidatePaths(paths: string[], deps: RevalidateDeps): Promise<string[]> {
  if (!deps.token) {
    deps.log(`[revalidate] no REVALIDATE_TOKEN, skipped. Pages that would refresh: ${paths.join(' ')}`)
    return []
  }
  const failed: string[] = []
  await Promise.all(paths.map(async (path) => {
    try {
      const res = await deps.fetch(deps.origin + path, { headers: { 'x-prerender-revalidate': deps.token! }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) failed.push(path)
    } catch {
      failed.push(path)
    }
  }))
  if (failed.length) deps.log(`[revalidate] could not refresh: ${failed.join(' ')}`)
  return failed
}

type Event = Parameters<typeof getRequestURL>[0]

/** Call after a write. `slugs` are the project slugs that changed (the old and new slug when it was renamed). Runs in the background when the platform allows it. */
export async function refreshPublicPages(event: Event, slugs: string[] = []): Promise<void> {
  const task = (async () => {
    try {
      const published = await useDb().project.findMany({ where: { published: true }, select: { slug: true } })
      const paths = affectedPaths({ slugs, publishedSlugs: published.map((p) => p.slug) })
      await revalidatePaths(paths, {
        token: process.env.REVALIDATE_TOKEN,
        origin: getRequestURL(event, { xForwardedProto: true, xForwardedHost: true }).origin,
        fetch: (url, init) => fetch(url, init),
        log: (line) => console.log(line),
      })
    } catch (err) {
      // a database error can carry connection details: log it only in the sanitised form
      console.error(`[revalidate] failed: ${describeDbError(err, process.env.DATABASE_URL)}`)
    }
  })()
  const wait = (event as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil
  if (typeof wait === 'function') wait.call(event, task)
  else await task
}
