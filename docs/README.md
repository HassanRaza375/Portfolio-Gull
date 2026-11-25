# Hafiz Gull portfolio: design pack

Put this whole folder in the repo as `design/`. In Claude Code, ask it to read this file and look at every image in `designs/` before writing any code.

Status: design and decisions only. No code has been written for the new project yet.

## What we are building

A Nuxt 4 full-stack rebuild of the current Vue portfolio (portfolio-gull-phi.vercel.app).

| Part | Decision |
|---|---|
| Framework / host | Nuxt 4 on Vercel |
| Database | PostgreSQL on Aiven |
| Images | Cloudinary (admin uploads, public pages serve optimized versions) |
| Admin | One person only. No user table, no sign-up. See `reference/hisaab-plan-reference.md` |
| Hero and About text | Stay in the code. Not editable from the admin |
| Priority | Home and About must load fast |
| Project page | Images stacked with no gap, no rounding and no cropping, so they read as one long design (this is a UI/UX portfolio) |

## Screens

| Image | Route | Kind | Data |
|---|---|---|---|
| `designs/01-home.png` | `/` | Public, cached | Project cards come from the database. Hero text and the three client logos are static |
| `designs/02-about.png` | `/about` | Public, static (prerendered) | None. Text and photo are in the code |
| `designs/03-project-page.png` | `/projects/[slug]` | Public, cached | One project from the database, looked up by slug |
| `designs/04-admin-login.png` | `/admin/login` | Admin | Email and password |
| `designs/05-admin-projects-list.png` | `/admin` | Admin, signed in only | All projects, including drafts |
| `designs/06-admin-project-editor.png` | `/admin/projects/new` and `/admin/projects/[id]` | Admin, signed in only | One project, with its uploads |

Reading the images:
- Gradient blocks stand for Cloudinary images.
- Text in [square brackets] is placeholder content.
- The three client logos in the images are cropped from a screenshot. Use the real SVGs from the existing repo (`src/assets/sat_japan.svg`, `game_district.svg`, `ozi_tech.svg`).
- The hero portrait is `src/assets/gull_main.png`, which is 529 KB. Convert it to an optimized format.

## Design values (taken from the current site)

- Font: Inter, weights 400, 500, 600 and 700.
- Page container: 1120 px wide with 16 px side padding, so content is 1088 px.
- Colors:
  - black `#000`, grey text `#737373`
  - chip background `#eee`, section background `#f2f6fb`
  - hero logo dividers `#afafaf`
- Nav: 32 px vertical padding, 1 px `#737373` bottom border, logo text 22 px semibold, links 16 px semibold with a 40 px gap.
- Primary button: black pill, 14 px by 28 px padding, 13 px semibold, uppercase.
- Chip: pill, 5 px by 10 px padding, 14 px medium.
- Project card: white, 12 px radius, 32 px padding, light shadow. It has two columns: text on the left and a cover image on the right (max 520 px wide, 443 px tall, cropped to fill). The card title is 40 px semibold.
- Footer: 1 px black top border, 14 px grey text.
- One deliberate change: body grey on the About page is `#6b6b6b` instead of `#7e7e7e`, so it reaches the 4.5:1 contrast needed for accessibility.
- Admin uses the same look: white and `#f2f6fb`, black pill buttons, 12 px radius cards.

## Behavior notes

**Home**
- Cards show in the order set in the admin. Only published projects appear.
- The hero portrait is the first thing visitors see, so load it first and give it a fixed size.
- Everything below the first screen loads lazily.

**Project page**
- Images fill the full container width and stack with zero gap.
- Never crop them. Store each image's real width and height in the database and use them to reserve space.
- "Visit project" shows only if the project has a URL.
- "Back" returns to Home. "Next" goes to the next project in order. On the last project, hide it (default, not yet confirmed).
- Do not show the first image twice (the old page did).

**Admin list**
- The up and down arrows change the order shown on Home.
- Delete asks for confirmation and also removes the project's images from Cloudinary.

**Admin editor**
- Fields: title, URL slug (filled from the title, editable), card summary, long description, tags, project URL, published checkbox.
- Images: client logo, cover image, and a gallery. Gallery images can be dragged into order and removed individually, and each upload shows progress.
- Every control needs a real label (accessibility).

## Data (what a project holds)

- Title, slug (unique), summary, description, tags, project URL.
- Logo, cover image and gallery images. For each image store the Cloudinary URL, its Cloudinary ID, width and height.
- Sort order, published flag, created and updated times.

## Speed requirements

- Home, About and project pages are served from cache. Visitors should not wait on the database.
- When a project is saved in the admin, the affected pages refresh within about a minute.
- Cloudinary images use automatic format and quality and the right size for each screen.
- Self-host the Inter font (no blocking Google Fonts request).
- Admin code must not load on public pages.
- I believe Aiven's free plan can power a service off when idle. This has not been verified. Check the plan's current terms.

## Using the reference plan

`reference/hisaab-plan-reference.md` is the plan written for your other project, kept for reference only. For this project:

- Public static: About.
- Public dynamic, read-only: Home and the project page.
- Admin: login, projects list, project editor.
- Only public Cloudinary images are needed (`type: "upload"`). No private files, so no signed links.
- Environment variables: `DATABASE_URL`, `DATABASE_CA_CERT`, `CLOUDINARY_URL`, `CLOUDINARY_FOLDER`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`.

## Decisions still open

Answers are defaults unless you change them.

1. **Database library:** the reference plan reuses Prisma files from your other project. Using Prisma here lets you copy them unchanged. I had earlier suggested Drizzle, so decide before starting.
2. **Image upload route:** the reference plan uploads through an admin route. Vercel limits request size to about 4.5 MB, and 1600 px UI screens are often bigger. Choose either a server upload with a size cap, or signed uploads straight from the browser to Cloudinary (my recommendation).
3. **"Next" on the last project:** hide (default) or wrap to the first.
4. **Maximum images per project:** unlimited (default) or a cap.
5. **Contact page:** the old one was an unlinked stub. Default is to drop it.

## Suggested build order

1. Project, database connection and a health route.
2. Database tables, applied from your machine.
3. Admin login, session cookie and guard, with tests that every admin route and API returns 404 when signed out.
4. Admin list and editor, with Cloudinary upload and delete.
5. Public Home and project page, then About.
6. Speed pass: hero image, fonts, caching, Cloudinary sizing.
7. Before going live: labels on every control, no secrets in the repo or logs, and the Vercel function region set next to the database.
