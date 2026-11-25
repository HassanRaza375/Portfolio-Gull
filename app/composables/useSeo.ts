// Per-page SEO: a unique title and description, the canonical URL, and Open Graph / Twitter tags.
// `path` is the page's own path ("/projects/my-project"); the site address comes from runtimeConfig.public.siteUrl.
interface SeoOptions {
  title: string
  description: string
  path: string
  /** An absolute image URL for link previews (the project cover for project pages). */
  image?: string
  imageAlt?: string
  /** Keep the page out of search results (error pages). */
  noindex?: boolean
}

export function useSeo({ title, description, path, image, imageAlt, noindex }: SeoOptions) {
  const origin = useRuntimeConfig().public.siteUrl as string
  const url = `${origin}${path}`
  const shareImage = image ?? `${origin}/og.jpg`
  const text = description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description

  useHead({
    title,
    link: noindex ? [] : [{ rel: 'canonical', href: url }],
  })
  useSeoMeta({
    description: text,
    robots: noindex ? 'noindex, nofollow' : undefined,
    ogType: 'website',
    ogSiteName: 'Hafiz Gull',
    ogTitle: title,
    ogDescription: text,
    ogUrl: url,
    ogImage: shareImage,
    ogImageAlt: imageAlt,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: text,
    twitterImage: shareImage,
  })
}
