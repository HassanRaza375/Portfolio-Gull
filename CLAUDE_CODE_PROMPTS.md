# Claude Code prompts: Hafiz Gull portfolio (Nuxt 4 full-stack)

Send the prompts one at a time. Wait for each to finish and check the result before sending the next.

## Before you start

This rebuild replaces the existing Vite + Vue app **in this same repo** (Portfolio-Gull). The design pack is already in `docs/`, and `.env` is git-ignored.

```bash
cd Portfolio-Gull
git checkout -b nuxt-rebuild   # keep main (the live Vite site) untouched until Nuxt is ready
claude
```

Notes:
- The old Vite app (`src/`, `index.html`, `vite.config.js`, `vue-router`) is removed as part of Prompt 2. Reusable assets to keep: `src/assets/sat_japan.svg`, `game_district.svg`, `ozi_tech.svg`, `gull_main.png`. The old Dashboard pages were already deleted on purpose.
- `vercel.json` must be replaced or removed, since Nuxt uses Vercel's Nuxt preset.
- `.env` is for real secrets and must never be committed.

Two things to settle first:
- **Prisma:** Prompts 1 and 2 assume Prisma so you can reuse `dbConfig.ts`, `db.ts` and `prisma.config.ts` from your other project. If you would rather use Drizzle, change that line in both prompts.
- **Direct Cloudinary uploads:** the prompts upload images straight from the browser to Cloudinary, because Vercel limits request size to about 4.5 MB. Your reference plan uploads through an admin route. If you prefer that, change the upload lines in Prompts 1 and 4.

---

## Prompt 1: Kickoff and plan (no code yet)

```
I'm rebuilding my UI/UX designer portfolio as a Nuxt 4 full-stack app on Vercel.
This replaces the existing Vite + Vue app in this repo. I'm on the branch nuxt-rebuild; main keeps the live Vite site.
Start in plan mode. Do not write code until I approve your plan.

Before planning, look at the current repo (src/, vercel.json, package.json). Tell me what gets deleted, what gets kept (the three client logo SVGs and src/assets/gull_main.png) and how the repo should be reorganized. .env already exists and is git-ignored; never read or print it.

Read these first, in this order:
1. docs/README.md (decisions, routes, design values, open items)
2. every image in docs/designs/ (01-home, 02-about, 03-project-page, 04-admin-login, 05-admin-projects-list, 06-admin-project-editor)
3. docs/reference/hisaab-plan-reference.md (a plan from my other project; reference only, adapt it, don't copy names blindly)

Stack and decisions:
- Nuxt 4 (app/ directory, server/ at the root), TypeScript, Tailwind v4 via @tailwindcss/vite, Inter font.
- Database: PostgreSQL on Aiven (SSL with a CA certificate). I'm using Prisma, as in my other project. I will paste dbConfig.ts, db.ts and prisma.config.ts from that project when you ask for them.
- Images: Cloudinary. All images are public (type "upload"). No private files and no signed download links.
- Hosting: Vercel.
- One admin only: no user table, no sign-up, no password reset. Credentials come from environment variables.
- Hero text, hero client logos and the About text stay in the code. They are not editable in the admin.
- Pages: / (Home, cards from the DB), /about (static, prerendered), /projects/[slug] (from the DB), /admin/login, /admin (projects list), /admin/projects/new and /admin/projects/[id] (editor).
- Speed is the top priority: Home and About must load fast.
- Project page: the images stack with no gap, no rounded corners and no cropping, so they read as one long design. Store each image's real width and height and use them to reserve space.

Open items (use these defaults unless you find a reason not to, and tell me if you do):
- Images upload directly from the browser to Cloudinary using a signature from an admin-only endpoint (Vercel's request size limit is about 4.5 MB).
- "Next" is hidden on the last project. No image limit per project. No Contact page.

Then give me a file-by-file plan: folders, pages, components, server routes, database tables (projects plus a login-attempt table), environment variables, and the build order from the reference. Flag anything in the design images that is unclear or impossible. Stop after the plan and wait for my approval.
```

---

## Prompt 2: Setup, database, health check

```
Plan approved. Build steps 1 and 2 only.

0. Remove the old Vite app (src/, index.html, vite.config.js, vue-router, old vercel.json) in this repo, after moving the three client logo SVGs and gull_main.png somewhere they are kept. Do not touch docs/, CLAUDE_CODE_PROMPTS.md or .env.
1. Create the Nuxt 4 project in this repo with the stack above, Tailwind v4 with the tokens from docs/README.md (colors, 1120px container, Inter), a .gitignore that excludes .env, and a .env.example listing: DATABASE_URL, DATABASE_CA_CERT, CLOUDINARY_URL, CLOUDINARY_FOLDER, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET.
2. Ask me for dbConfig.ts, db.ts and prisma.config.ts from my other project and adapt them. Aiven needs SSL with the CA certificate. Do not turn certificate checks off. Keep the pool small for Vercel serverless (or use Aiven's connection pooler) and tell me which Prisma version and driver adapter the config needs.
3. Prisma schema:
   - Project: id, slug (unique), title, summary, description, tags (string array), projectUrl, logo, cover and gallery images (each with url, publicId, width, height), sortOrder, published, createdAt, updatedAt.
   - LoginAttempt: for the login rate limit.
4. GET /api/health that returns database "up" or "down".
5. Show me the exact commands to run the migration from my machine. Do not run it against my production database yourself.

Tell me what to put in .env and wait for me to confirm the health check works.
```

---

## Prompt 3: Admin login and guard

```
Build step 3: admin authentication, following docs/reference/hisaab-plan-reference.md.

- Credentials: ADMIN_EMAIL and ADMIN_PASSWORD_HASH from env. The hash uses Node's built-in scrypt with a random salt, compared with timingSafeEqual. Add a small script (npm run hash-password) that makes a hash on my machine without storing the plain password anywhere.
- Session: a signed cookie (HttpOnly, Secure, SameSite=Lax, about 7 days) using SESSION_SECRET and an HMAC. The cookie holds only an expiry and a signature.
- Guard: every /api/admin/* route and every /admin page (except /admin/login) runs the same check. Signed-out requests to /api/admin/* return 404, not 401.
- Login limit: 5 tries per minute per address plus a short delay after a wrong password, stored in the LoginAttempt table.
- Writes: same-origin check plus the cookie check.
- POST /api/admin/login and POST /api/admin/logout, and the login page that matches docs/designs/04-admin-login.png. Use real labels on the inputs.
- Admin pages must not be indexed by search engines (noindex and disallowed in robots).

Write tests proving a signed-out visitor gets 404 on every admin route and API, and that a wrong password is rate limited. Run them and show me the results.
```

---

## Prompt 4: Admin list and editor with Cloudinary

```
Build step 4: the admin projects list and editor, matching docs/designs/05-admin-projects-list.png and 06-admin-project-editor.png.

List (/admin):
- Table with thumbnail, title, slug, tags, Published/Draft status, Edit and Delete. Cards on mobile.
- Up/down arrows change the order shown on the Home page.
- Delete asks for confirmation and also deletes the project's images from Cloudinary.
- "New project" and "Sign out".

Editor (/admin/projects/new and /admin/projects/[id]):
- Fields: title, slug (filled from the title, editable, unique), card summary, long description, tags (type and press Enter), project URL (optional), Published checkbox.
- Client logo, cover image and gallery. Gallery images can be reordered by dragging and removed one by one, with per-image upload progress. Show a short note that images join with no gap and should be exported at the same width (1600px recommended).
- Uploads go straight from the browser to Cloudinary using a signature from an admin-only endpoint. Validate type (PNG, JPG, WebP, SVG for logos) and size (10 MB). Read each image's width and height and save them with the URL and publicId.
- Removing an image on save deletes it from Cloudinary.
- Use CLOUDINARY_FOLDER so this project's images stay in their own folder.
- "Preview" button (in the design): opens the project page as visitors would see it, including drafts and unsaved-published projects. It uses an admin-only route that skips the published filter and the cache, and is noindex. "View site" in the admin header links to Home.
- Real labels on every control, visible focus states, errors shown next to the field.

Saving a project must refresh the affected public pages (see Prompt 5). Show me how to test this locally before you continue.
```

---

## Prompt 5: Public pages and speed

```
Build step 5 and the speed pass: the public pages, matching docs/designs/01-home.png, 02-about.png and 03-project-page.png.

- Home (/): hero and the three client logos are static. Cards come from published projects in sort order; everything below the first screen loads lazily. "View project" goes to /projects/[slug].
- About (/about): fully static and prerendered.
- Project page (/projects/[slug]): title, description (blank lines make paragraphs), tags, "Visit project" button only when a URL exists, then the gallery stacked full width with zero gap, no rounded corners and no cropping, using the stored width and height to reserve space. Back goes to Home. Next goes to the next project and is hidden on the last one. Unknown or unpublished slugs show a proper 404.
- Navbar and footer as in the design. The footer year is generated, not typed in.
- Public pages read the database only through one read-only server route, with no write routes.

Speed requirements:
- Cache Home and project pages (stale-while-revalidate or ISR on Vercel) so visitors do not wait on the database. A saved change must show up within about a minute. If on-demand revalidation after an admin save is practical on Vercel, use it and explain how.
- The hero portrait (gull_main.png, kept from the old src/assets, 529 KB; there is also an old gull_portrait.webp, so check whether it is usable) must be converted to optimized WebP/AVIF at proper sizes, with fixed width and height, high fetch priority and preloaded.
- Cloudinary images: automatic format and quality (f_auto, q_auto) and a width that fits the screen (responsive sizes); logos small.
- Self-host Inter with no blocking request to Google Fonts.
- No admin code on public pages.
- SEO: unique title and description per page, canonical URLs, Open Graph image per project (the cover image), sitemap.xml with published projects, and robots.txt.

Then run a production build, run Lighthouse on Home, About and one project page, and show me the scores and anything below 90.
```

---

## Prompt 6: Final checks and deploy

```
Final pass.

1. Accessibility: every control has a label, visible focus states, text contrast of at least 4.5:1, and images have alt text (taken from the project title).
2. Security: no secrets in the repo, logs or client bundle. Confirm the admin APIs return 404 when signed out. Confirm Cloudinary and database secrets never reach the browser.
3. Vercel: tell me the exact environment variables to add (Production only), the function region closest to my Aiven database, and any Aiven settings (allowed IPs, CA certificate) I need to change.
4. Write a short README for this repo: how to run locally, how to create the admin password hash, how to run the database migration, how to deploy.
5. Give me a go-live checklist.

Do not deploy for me. List what I must do by hand.
```
