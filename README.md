# Hafiz Gull portfolio

A UI/UX designer portfolio built with Nuxt 4. Home and the project pages are cached, About is fully static, and one person (the owner) manages the projects from a private admin.

- **Stack:** Nuxt 4, TypeScript, Tailwind CSS v4, Prisma 7 on PostgreSQL (Aiven), Cloudinary for images, hosted on Vercel.
- **Public pages:** `/` (cards), `/about` (static), `/projects/[slug]` (images stacked as one long design).
- **Admin:** `/admin/login`, `/admin` (list and order), `/admin/projects/new` and `/admin/projects/[id]` (editor). Signed-out visitors get a plain 404 for everything under `/admin` and `/api/admin`.

## Run it locally

You need Node 22.18 or newer, a PostgreSQL database and a Cloudinary account.

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env             # then fill in the values (see below)
npm run hash-password            # asks for a password, prints ADMIN_PASSWORD_HASH=...
npx prisma migrate deploy        # creates the tables (see "Database")
npm run dev                      # http://localhost:3000
```

Check it works: open `http://localhost:3000/api/health` (should say `"database": "up"`), then sign in at `/admin/login`.

### Environment variables

| Variable | What it is |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, ending `?sslmode=require` |
| `DATABASE_CA_CERT` | The database's CA certificate (PEM text). Certificate checks are never turned off |
| `CLOUDINARY_URL` | `cloudinary://<api_key>:<api_secret>@<cloud_name>` |
| `CLOUDINARY_FOLDER` | Folder for this site's images, for example `portfolio-gull` |
| `ADMIN_EMAIL` | The one admin's email |
| `ADMIN_PASSWORD_HASH` | From `npm run hash-password` |
| `SESSION_SECRET` | 32+ random characters (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) |
| `REVALIDATE_TOKEN` | Optional locally. 32+ random characters; lets a save in the admin refresh the cached pages at once |
| `NUXT_PUBLIC_SITE_URL` | The public address, such as `https://example.com`. Leave empty locally |

`.env` is ignored by git. Never commit it.

## The admin password

```bash
npm run hash-password
```

It asks for the password twice (hidden, at least 12 characters) and prints one line to put in `.env` as `ADMIN_PASSWORD_HASH`. The password itself is never saved. To change the password, run it again and update the variable (locally and in Vercel).

## Database

Tables are created from `prisma/migrations` and applied **from your own machine**, never by the app:

```bash
npx prisma migrate deploy        # applies the migrations in prisma/migrations to DATABASE_URL
```

To change the schema, edit `prisma/schema.prisma`, run `npx prisma migrate dev --name what_changed` against a development database, commit the new folder under `prisma/migrations`, then run `migrate deploy` against production **before** deploying code that needs it.

## Images

Admin uploads go from the browser straight to Cloudinary (Vercel limits request bodies to about 4.5 MB). The hero portrait is built once from `docs/source-images/gull_main.png`:

```bash
npm run optimize-images          # only needed if that source image changes
```

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests plus an end-to-end test that starts its own server (needs no database) |
| `npm run typecheck` | Type checks the app and the server |
| `npm run build` | Production build for Vercel |

## Deploy

Deploy on Vercel from this repository (the Nuxt preset is detected automatically). The settings, the Aiven checklist and a go-live list are in [docs/go-live-checklist.md](docs/go-live-checklist.md).
