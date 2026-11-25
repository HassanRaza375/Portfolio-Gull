import tailwindcss from '@tailwindcss/vite'

// Security headers for every response, in production only (the dev server needs eval and websockets for hot reload).
//  - script-src / style-src allow 'unsafe-inline' because Nuxt writes its start-up data and the inlined stylesheet into the page; nothing else
//    can run: no other origin, no eval, no plugins ('object-src none'), no framing ('frame-ancestors none').
//  - Images come from this site and Cloudinary (res.cloudinary.com); the admin uploads straight to api.cloudinary.com.
const securityHeaders: Record<string, string> = process.env.NODE_ENV === 'production'
  ? {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://res.cloudinary.com",
        "font-src 'self'",
        "connect-src 'self' https://api.cloudinary.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      'Strict-Transport-Security': 'max-age=31536000',
    }
  : {}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-25',
  devtools: { enabled: false },
  // NUXT_BUILD_DIR lets a second build (for example a local Lighthouse run) use its own folder, so it never disturbs a running dev server.
  ...(process.env.NUXT_BUILD_DIR ? { buildDir: process.env.NUXT_BUILD_DIR } : {}),
  // Use components by their file name (<TagInput>), not by folder + name (<AdminTagInput>)
  components: [{ path: '~/components', pathPrefix: false }],
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  // Secrets (DATABASE_URL, DATABASE_CA_CERT, CLOUDINARY_URL, ADMIN_*, SESSION_SECRET) are
  // read from process.env at request time in server code, never through runtimeConfig:
  // a runtimeConfig value taken from process.env at build time is written into the build output.

  // The public site address, for canonical links, social-sharing URLs, the sitemap and robots.txt. Not a secret.
  // Set NUXT_PUBLIC_SITE_URL to your real domain; on Vercel it falls back to the production URL Vercel provides.
  runtimeConfig: {
    public: {
      siteUrl: (process.env.NUXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
      ).replace(/\/+$/, ''),
    },
  },

  nitro: {
    // NITRO_PRESET=node-server builds a plain Node server (used for local Lighthouse runs); the default is Vercel.
    preset: process.env.NITRO_PRESET || 'vercel',
    vercel: {
      // Lets the admin refresh cached pages the moment a project is saved (server/utils/revalidate.ts sends this token
      // in the `x-prerender-revalidate` header). Vercel needs 32+ random characters. It must be set at BUILD time too.
      // Without it the pages still refresh by themselves within a minute.
      config: { bypassToken: process.env.REVALIDATE_TOKEN || undefined },
    },
  },

  // Put the (small) stylesheet in the HTML, so the first paint does not wait for a second request.
  features: { inlineStyles: true },

  // Keep each page's data inside its HTML. Without this Nuxt moves it to a separate /_payload.json file that must be fetched
  // before the page can hydrate, and that file would be a second cached route to refresh after every admin save.
  experimental: { payloadExtraction: false },

  hooks: {
    // Nuxt adds idle "prefetch" hints for the files a page's components use. Two of them are unwanted here:
    //  - image files imported by the hero (it would also fetch the WebP and 2x variants that the browser does not use), and
    //  - admin code: public visitors must never download it, not even in the background.
    // Prefetching of the other page chunks (Home -> project page) is kept, so navigation stays fast.
    'build:manifest': (manifest) => {
      for (const [key, item] of Object.entries(manifest)) {
        item.assets = []
        if (/(^|\/)admin(\/|\.|-)/i.test(item.src ?? key) || /\/components\/admin\//.test(item.src ?? key)) {
          item.prefetch = false
          item.preload = false
        }
      }
    },
  },

  routeRules: {
    '/**': { headers: securityHeaders },
    // Home and project pages: cached on Vercel (ISR) and rebuilt in the background at most a minute after a change, so visitors never wait on the database.
    // A save in the admin refreshes them immediately when REVALIDATE_TOKEN is set. About has no data and is built once, at build time.
    // (A plain Node server has no ISR, so a local Node build, used for speed measurements, caches the same pages in memory instead.)
    '/': { isr: 60, ...(process.env.NITRO_PRESET === 'node-server' ? { swr: 60 } : {}) },
    '/projects/**': { isr: 60, ...(process.env.NITRO_PRESET === 'node-server' ? { swr: 60 } : {}) },
    '/about': { prerender: true },
    // Admin pages: client-rendered, never cached, never indexed. The server guard (server/middleware/admin-guard.ts) 404s them when signed out.
    '/admin/**': { ssr: false, headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } },
    '/api/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } },
  },
})
