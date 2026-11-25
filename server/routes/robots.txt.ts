// /robots.txt: the admin area and the API are off limits, and the sitemap is announced.
import { siteOrigin } from '../../shared/utils/siteUrl'

export default defineEventHandler((event) => {
  const origin = siteOrigin(useRuntimeConfig(event).public.siteUrl as string)
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600')
  return ['User-agent: *', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n')
})
