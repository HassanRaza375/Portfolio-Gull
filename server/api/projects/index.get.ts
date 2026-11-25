// GET /api/projects -> the cards for Home: published projects in Home order. Public and read-only (there are no write routes under /api/projects).
// Cached at the edge for a short time; a change in the admin also refreshes the cached pages directly (server/utils/revalidate.ts).
import type { PublicCard } from '../../../shared/project'
import { useDb } from '../../utils/db'
import { imageOrNull } from '../../utils/projects'

export default defineEventHandler(async (event) => {
  const rows = await useDb().project.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { slug: true, title: true, summary: true, tags: true, logo: true, cover: true },
  })
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30')
  return rows.map((r): PublicCard => ({ ...r, logo: imageOrNull(r.logo), cover: imageOrNull(r.cover) }))
})
