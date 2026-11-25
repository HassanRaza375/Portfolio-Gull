# Hafiz Gull portfolio

A UI/UX designer portfolio built as a full-stack Nuxt 4 app. Visitors see a fast, cached portfolio. One person (the owner) manages the projects from a private admin. Live at <https://portfolio-gull-phi.vercel.app>.

**Contents:** [Features](#features) · [Architecture](#architecture-at-a-glance) · [Tech stack](#tech-stack) · [Project structure](#project-structure) · [Data model](#data-model) · [How it works](#how-it-works) · [Environment variables](#environment-variables) · [Run it locally](#run-it-locally) · [Using the admin](#using-the-admin) · [Tests](#tests) · [Deploying](#deploying) · [Troubleshooting](#troubleshooting) · [Decisions and lessons](#decisions-and-lessons) · [Results](#results) · [More documents](#more-documents)

## Features

**Public site**
- **Home (`/`)**: a fixed hero (quote, role, three client logos, portrait) and one card per published project, in the order set in the admin.
- **About (`/about`)**: fully static, built once at build time.
- **Project page (`/projects/[slug]`)**: title, description, tags, an optional "Visit project" button, and the project images stacked full width with no gap, no rounded corners and no cropping, so they read as one long design. Back and Next links (Next is hidden on the last project).
- A real 404 page for unknown or unpublished projects. Per-page titles, descriptions, canonical links, share previews, `sitemap.xml` and `robots.txt`.

**Admin (one owner, no user table)**
- Sign in at `/admin/login`. Signed-out visitors get a plain 404 for everything under `/admin` and `/api/admin`.
- Projects list with up/down ordering, edit and delete (delete also removes the images from Cloudinary).
- Editor: title, slug, card summary, description, tags, project URL, published switch, client logo, cover image and a drag-to-reorder gallery with upload progress, plus a Preview of the last saved version (drafts included).

## Architecture at a glance

```
 Visitor ──► Vercel CDN ──► cached HTML for / and /projects/*   (ISR, rebuilt at most every 60 s)
                       └─► static files for /about and /_nuxt/*  (built once)
                                  │ cache miss or refresh
                                  ▼
                       Vercel function (Nitro) ──► Prisma ──► PostgreSQL on Aiven
                                  ▲
 Admin (browser) ──► /api/admin/* (guarded) ──┤
        │                                     └─► refresh cached pages after a save
        └─ signed upload ─► Cloudinary (images) ◄─ images are served to visitors from here
```

## Tech stack

| Part | Choice |
|---|---|
| Framework | Nuxt 4 (Vue 3, Nitro server), TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), Inter font self-hosted |
| Database | PostgreSQL on Aiven, accessed with Prisma 7 and the `pg` driver adapter |
| Images | Cloudinary (admin uploads, public pages serve optimized versions) |
| Hosting | Vercel (ISR for cached pages) |
| Validation | Zod, shared by the browser and the server |
| Tests | Vitest, plus an end-to-end test that starts a real server |

## Project structure

```
app/                         The browser side (Nuxt 4 "app" folder)
  pages/                       index, about, projects/[slug], admin/* (login, list, editor, preview)
  components/site/             Navbar, Footer, Hero, ProjectCard, ProjectDetail   (public)
  components/admin/            ProjectForm, ProjectTable, ImageField, GalleryEditor, TagInput, ConfirmDialog
  layouts/                     default (public) and admin
  middleware/admin.ts          Client-side redirect to login (a convenience, not the security check)
  composables/                 useSeo, useImageUpload
  utils/adminFetch.ts          $fetch wrapper for the admin API
  assets/                      CSS and the tokens, fonts, hero images, client logo SVGs
server/                      The server side (Nitro)
  api/projects/                Public, read-only: the cards and one project
  api/admin/                   Guarded: login, logout, session, projects CRUD, move, uploads (sign, discard)
  api/health.get.ts            Database check
  middleware/admin-guard.ts    The one guard for every admin page and API
  routes/                      sitemap.xml and robots.txt
  utils/                       db, dbConfig, session, password, login, rate limit store, cloudinary, projects, revalidate, adminPaths
shared/                      Code used by both sides: project schema and types, Cloudinary URL helpers, site URL helper
prisma/                      schema.prisma and migrations/  (applied by hand, see the deployment guide)
scripts/                     hash-password.mjs and optimize-images.mjs
tests/                       Unit tests and tests/e2e (starts its own server)
docs/                        Design pack, go-live checklist, deployment guide
```

## Data model

Two tables, defined in `prisma/schema.prisma`.

- **Project**: `id`, `slug` (unique), `title`, `summary`, `description`, `tags` (text array), `projectUrl`, `logo`, `cover`, `gallery`, `sortOrder`, `published`, `createdAt`, `updatedAt`. Each image is stored as JSON `{ url, publicId, width, height }` (the real pixel size, used to reserve space on the page).
- **LoginAttempt**: `ip` and `createdAt`, used for the login rate limit (serverless instances share no memory, so the count lives in the database).

## How it works

### Caching and speed
- **Home and project pages** use Vercel ISR with a 60 second expiry: visitors get cached HTML, and a page is rebuilt in the background after it goes stale. When the admin saves, the server also asks Vercel to refresh the affected pages at once (see "Refreshing the cache" below).
- **About** is prerendered to a static file at build time.
- **Hero portrait**: built once from the original (`docs/source-images/gull_main.png`) by `npm run optimize-images`: grayscale baked in, AVIF and WebP, 560 px and 840 px, preloaded with high priority and fixed dimensions (529 KB became 15 KB).
- **Fonts**: Inter (Latin and Latin Extended) is served from this site with a preload and a size-matched fallback. There is no request to Google Fonts.
- **Cloudinary images** use `f_auto,q_auto` and finely stepped widths, so a phone downloads the smallest sharp version. Every image has a width and height, so nothing shifts while loading.
- **Stylesheet** is inlined in the HTML. Page data stays inside the HTML (no separate payload file). Nuxt's idle prefetching of admin code and image variants is removed (`build:manifest` hook in `nuxt.config.ts`), so public visitors never download admin code.
- **Public API** answers carry `s-maxage=30, stale-while-revalidate=30`.

### Refreshing the cache after a save
Every admin write (create, save, delete, reorder) calls `refreshPublicPages` (`server/utils/revalidate.ts`). It requests `/`, the changed project pages and every published project page with the header `x-prerender-revalidate: <REVALIDATE_TOKEN>`, which makes Vercel rebuild them immediately. Nitro writes the token into the ISR configuration at **build** time (`nitro.vercel.config.bypassToken`), so `REVALIDATE_TOKEN` must exist at build and at runtime. Without it everything still refreshes by itself within a minute. Locally nothing is sent, the pages that would refresh are logged.

### Admin and security
- **Guard**: `server/middleware/admin-guard.ts` runs for every request. It normalizes the path first (so `/Admin`, `//admin`, `/%61dmin` and `/admin/../admin` all count as admin), lets through only `/admin/login` and `POST /api/admin/login`, and answers **404** (not 401) to everything else without a valid session, so a stranger cannot tell the admin area exists.
- **Login**: `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` from the environment. The hash is Node's built-in scrypt with a random salt (compared with `timingSafeEqual`). 5 tries per minute per address, stored in `LoginAttempt`, plus a 0.5 to 2 second delay after a wrong password. If the tries cannot be counted, login refuses instead of allowing unlimited guessing.
- **Session**: a cookie (`hg_admin`) that holds only an expiry and an HMAC signature (HttpOnly, Secure, SameSite=Lax, 7 days).
- **Writes** need a valid session and a same-origin request.
- **Headers (production)**: Content Security Policy (only this site, Cloudinary images, uploads to Cloudinary), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS. Admin pages and APIs are `noindex` and `no-store`. The CSP allows inline scripts because Nuxt writes its start-up data into the page.
- **Secrets** are read from `process.env` at request time, never through `runtimeConfig`, so they cannot end up in the build output. Logs never contain passwords, hashes or tokens. A check of the build and the repository for the real secret values found none.
- **Database TLS**: the Aiven CA certificate is trusted and the host name is still verified. Certificate checks are never turned off (a test scans the server code for that).

### Images and Cloudinary
- The browser uploads **straight to Cloudinary** (Vercel limits request bodies to about 4.5 MB). The server only signs the upload: `POST /api/admin/uploads/sign` signs the folder, the allowed formats and a timestamp, and returns `cloudName` and `apiKey`, never the API secret.
- Allowed: PNG, JPG and WebP (and SVG for logos), up to 10 MB each. The size limit is checked in the browser only, because Cloudinary cannot enforce it on a signed upload; set a maximum file size in your Cloudinary account if you want it enforced.
- The server accepts only images that live in your Cloudinary cloud, under `CLOUDINARY_FOLDER`, in the right sub-folder (`logo`, `cover`, `gallery`), and deletes only inside that folder.
- Removing an image and saving, or deleting a project, deletes the files from Cloudinary. An image uploaded in the editor and removed before saving is discarded at once (and never if a saved project uses it).

### SEO
Unique title and description per page, canonical URL, Open Graph and Twitter tags (the project cover for project pages, `public/og.jpg` otherwise), `sitemap.xml` of published projects, `robots.txt` (admin and API disallowed, sitemap announced). The site address comes from `NUXT_PUBLIC_SITE_URL` (see below).

## Environment variables

Copy `.env.example` to `.env` and fill it in. `.env` is ignored by git and must never be committed.

| Variable | What it is | Needed at build? |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string, ending `?sslmode=require` | no (runtime) |
| `DATABASE_CA_CERT` | The database's CA certificate (PEM text). `\n` escapes also work | no (runtime) |
| `CLOUDINARY_URL` | `cloudinary://<api_key>:<api_secret>@<cloud_name>` | no (runtime) |
| `CLOUDINARY_FOLDER` | Folder for this site's images, for example `portfolio-gull`. Changing it later makes existing saved images invalid | no (runtime) |
| `ADMIN_EMAIL` | The one admin's email | no (runtime) |
| `ADMIN_PASSWORD_HASH` | From `npm run hash-password` | no (runtime) |
| `SESSION_SECRET` | 32+ random characters. Changing it signs the admin out | no (runtime) |
| `REVALIDATE_TOKEN` | 32+ random characters; enables the immediate cache refresh after a save. Leave empty locally | **yes, and runtime** |
| `NUXT_PUBLIC_SITE_URL` | Public address with `https://`, for example `https://example.com`. Leave empty locally | **yes, and runtime** |

Generate a random value with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.

## Run it locally

You need Node 22.18 or newer, a PostgreSQL database and a Cloudinary account. **Use a separate test database for local work** (this project has one test and one production database, and they must not be mixed up).

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env             # then fill it in
npm run hash-password            # prints ADMIN_PASSWORD_HASH=...
npx prisma migrate deploy        # creates the tables in the database DATABASE_URL points to
npm run dev                      # http://localhost:3000
```

Check it: open `/api/health` (it should say `"database": "up"`), then sign in at `/admin/login`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | All tests (starts its own server on port 3077, needs no database) |
| `npm run typecheck` | Type-checks the app and the server |
| `npm run build` | Production build for Vercel |
| `npm run hash-password` | Creates an admin password hash (hidden input, 12+ characters, never saved) |
| `npm run optimize-images` | Rebuilds the hero images and `public/og.jpg` from the source image |

## Using the admin

1. Sign in at `/admin/login`.
2. **New project**: fill in the title (the slug fills in by itself and can be edited), the card summary, the description (blank lines make paragraphs), tags (type and press Enter), and an optional project URL. Upload a client logo and a cover image, then the gallery.
3. **Gallery**: export every screen at the **same width** (1600 px works well). Images join with no gap and are never cropped. Drag to reorder (or use the Move buttons), and remove one with the x. A warning appears if the widths differ.
4. **Publish**: tick "Published". A cover image is required to publish. Drafts are visible only in the admin and in Preview.
5. **Preview** opens the last *saved* version in a new tab. Save first.
6. **Order**: the arrows on the list set the order on Home (Next on a project page follows the same order).
7. **Delete** asks for confirmation and removes the images from Cloudinary.
8. Changes appear on the site within seconds (or within a minute if `REVALIDATE_TOKEN` is not set).

Change the admin password: run `npm run hash-password`, update `ADMIN_PASSWORD_HASH` in Vercel, redeploy. To sign out every session, change `SESSION_SECRET` and redeploy.

## Tests

`npm test` runs about 110 tests in four files:
- `tests/auth.test.ts`: password hashing, session cookies, admin path matching, the same-origin check, login and the rate limit (with an in-memory store).
- `tests/projects.test.ts`: validation, Cloudinary signing (checked against Cloudinary's own SDK), image ownership, delivery URLs, next/previous project, cache refresh paths, safe log messages, the site address helper.
- `tests/dbConfig.test.ts`: database TLS options, secret redaction, and a scan proving certificate checks are never turned off.
- `tests/e2e/admin-guard.test.ts`: starts the real server **without a database** and checks over HTTP that every admin page and API (discovered from the files, so new routes are covered automatically) answers 404 signed out, with every method and spelling; cookie forgery and expiry; same-origin rules; signing without exposing the secret; public pages, SEO tags and the 404 page; and that there are no public write routes.

## Deploying

The step-by-step guides are in `docs/`:
- **[docs/deployment-guide.md](docs/deployment-guide.md)**: the full guide for Aiven, Prisma migrations (including production), Vercel and secrets. Written to be reused for future projects.
- **[docs/go-live-checklist.md](docs/go-live-checklist.md)**: the checklist for this site.

In short: create the tables in the **production** database from your own machine with `npx prisma migrate deploy` (see the guide for the safe way), add the environment variables in Vercel (Production), set the Framework Preset to Nuxt.js and the function region next to the database, push to `main`, and run the live checks. Vercel deploys `main` to production.

## Troubleshooting

| What you see | Likely cause |
|---|---|
| Vercel shows `503 FUNCTION_INVOCATION_FAILED` on Home | The database has no tables (the migration was never applied to the **production** database) or it is unreachable. Open `/api/health` and the Vercel logs |
| `/api/health` says `"tables": "missing"` | Connected to a database without the tables: run `migrate deploy` against the right database |
| `The table public.Project does not exist` in the logs | The same as above |
| Links contain `//` (for example `.com//about`) | `NUXT_PUBLIC_SITE_URL` ends with `/`. The code now tolerates it; remove the slash anyway |
| Saved changes only show up after a minute | `REVALIDATE_TOKEN` is missing, or was added after the build. Redeploy |
| Build fails with a `vite` error | The Vercel Framework Preset is still "Vite". Set it to Nuxt.js |
| Admin sign-in says "temporarily unavailable" | The login attempts cannot be recorded: the database is unreachable or the tables are missing |
| Preview deployments show an error | Environment variables are Production-only. Add Preview variables (pointing at a test database) |

More in the deployment guide.

## Decisions and lessons

- **Prisma 7 with the `pg` adapter** (not Drizzle), reusing the database setup from an earlier project. Aiven signs its certificate with a per-project CA, so the CA is passed to the driver and the host name is still verified.
- **Direct-to-Cloudinary uploads** instead of uploading through the server, because of Vercel's request size limit.
- **No `@nuxt/image`**: the only image that needs processing (the hero) is built once ahead of time and served as hashed static files from the CDN, with no runtime image service.
- **404 for signed-out admin requests**, not 401, so the admin area is invisible to strangers. The client can still tell "session ended" (404 without a code) from "project not found" (404 with `project_not_found`).
- **Page data stays in the HTML** (`payloadExtraction: false`): one fewer request before the page can hydrate, and one fewer cached route to refresh.
- **Health check checks the tables**: it first only ran `SELECT 1`, which said "up" for a database that was reachable but empty. That hid the real production problem below.
- **The production launch problem:** the first production deploy showed `FUNCTION_INVOCATION_FAILED`. The Vercel logs said `The table public.Project does not exist`: there are two databases (test and production), and the migration had only been applied to the test one. The fix was to run `prisma migrate deploy` against production. Lesson: a new database needs its migration applied **before** the first deploy that uses it, and the deployment guide now has that as an explicit step.
- **A trailing slash in `NUXT_PUBLIC_SITE_URL`** doubled up in canonical and sitemap links, because Nuxt applies the variable at runtime without the config's clean-up. Every use now goes through `siteOrigin()`.
- **Never run a migration against production from an assistant or a script you did not read.** It is a manual step with a visible check of which database it targets.

## Results

Lighthouse, mobile (simulated slow 4G), measured on the production build with Brotli compression standing in for Vercel's CDN and the page cache warm:

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home | 99 | 100 | 100 | 100 |
| About | 99 | 100 | 100 | 100 |
| Project | 92 | 100 | 100 | 100 |

An axe accessibility scan of 9 public and admin pages found 0 violations, every control shows a visible focus ring, and every text and background colour pair reaches 4.5:1. `npm audit` reports two advisories, both in build-time tooling that is not part of the deployed site (Prisma's command-line tooling and Nitro's build tooling).

## More documents

- [docs/deployment-guide.md](docs/deployment-guide.md): Aiven, Prisma migrations, Vercel, secrets, troubleshooting, and a checklist for starting a new project on the same stack.
- [docs/go-live-checklist.md](docs/go-live-checklist.md): the checklist for this site.
- [docs/README.md](docs/README.md): the original design brief (screens, design values, behaviour). The design images are in `docs/designs/`.
- [CLAUDE_CODE_PROMPTS.md](CLAUDE_CODE_PROMPTS.md): the prompts this project was built with.
