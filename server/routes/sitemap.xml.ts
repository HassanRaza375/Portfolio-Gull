// /sitemap.xml: Home, About and every published project.
import { siteOrigin } from '../../shared/utils/siteUrl'
import { useDb } from '../utils/db'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default defineEventHandler(async (event) => {
  const origin = siteOrigin(useRuntimeConfig(event).public.siteUrl as string)
  const rows = await useDb().project.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { slug: true, updatedAt: true },
  })
  const urls = [
    { loc: `${origin}/` },
    { loc: `${origin}/about` },
    ...rows.map((r) => ({ loc: `${origin}/projects/${r.slug}`, lastmod: r.updatedAt.toISOString() })),
  ]
  const body = urls
    .map((u) => `  <url><loc>${esc(u.loc)}</loc>${'lastmod' in u ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
})
