/**
 * The site address as a clean origin: spaces and any trailing slashes removed, so `${origin}/about` never becomes ".com//about".
 * The environment variable NUXT_PUBLIC_SITE_URL reaches the app at runtime as typed, so every place that uses it goes through this.
 */
export const siteOrigin = (raw: string | undefined | null): string => (raw ?? '').trim().replace(/\/+$/, '')
