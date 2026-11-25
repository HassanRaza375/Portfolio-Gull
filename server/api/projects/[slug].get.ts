// GET /api/projects/:slug -> one PUBLISHED project plus the next one in Home order. Unknown, malformed and unpublished slugs all answer the same 404.
import { nextInOrder, slugPattern, type PublicProject } from '../../../shared/project'
import { useDb } from '../../utils/db'
import { galleryOf, imageOrNull } from '../../utils/projects'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const notFound = () => createError({ statusCode: 404, statusMessage: 'Not Found' })
  if (slug.length > 80 || !slugPattern.test(slug)) throw notFound() // never reaches the database

  const db = useDb()
  const row = await db.project.findFirst({ where: { slug, published: true } })
  if (!row) throw notFound()

  const ordered = await db.project.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { slug: true, title: true },
  })
  const next = nextInOrder(ordered, slug)

  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30')
  const project: PublicProject = {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    tags: row.tags,
    projectUrl: row.projectUrl,
    logo: imageOrNull(row.logo),
    cover: imageOrNull(row.cover),
    gallery: galleryOf(row.gallery),
    next,
  }
  return project
})
