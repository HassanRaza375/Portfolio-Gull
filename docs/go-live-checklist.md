# Go-live checklist

Nothing here is done for you. Work through it in order. The reasons and the details behind each step, and the fixes for things that go wrong, are in [deployment-guide.md](deployment-guide.md).

> **Two databases:** this project has a **test** database (used locally) and a **production** database (used by Vercel). A new database is empty, so the migration must be applied to **production** before the first deploy that uses it: [deployment guide, section 4.2](deployment-guide.md#42-applying-migrations-to-production-the-safe-way). Skipping this was the cause of the first production error (`The table public.Project does not exist`).

## 1. Before you deploy

- [ ] **Replace the test content.** The database still holds the placeholder project (lorem ipsum text and tags). Edit or delete it in `/admin`, then add the real projects, each with a logo, a cover and its gallery.
- [ ] **Look at the real order on Home**, using the arrows in `/admin`.
- [ ] **Commit your work.** `git status` must not list `.env`. Then push the `nuxt-rebuild` branch.
- [ ] **Make production secrets.** Do not reuse the development ones:
  - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
  - `REVALIDATE_TOKEN`: the same command (it must be 32+ characters)
  - `ADMIN_PASSWORD_HASH`: `npm run hash-password` with a new password
- [ ] **Delete `docs/files/`** if you do not want your other project's database code in this repository.

## 2. Vercel project

Import the repository. Leave the framework preset on Nuxt, and the build command and output folder on their defaults. Set **Node.js Version** to 22.x or newer (Settings, General).

### Environment variables (Production only)

Add each one under Settings, Environment Variables, and tick **Production** only. Mark the secrets as **Sensitive**.

| Variable | Value | Needed at build? |
|---|---|---|
| `DATABASE_URL` | Aiven connection string, ending `?sslmode=require` | no (runtime) |
| `DATABASE_CA_CERT` | The Aiven CA certificate, pasted as PEM (the whole block, line breaks included) | no (runtime) |
| `CLOUDINARY_URL` | `cloudinary://<api_key>:<api_secret>@<cloud_name>` | no (runtime) |
| `CLOUDINARY_FOLDER` | `portfolio-gull` (or the folder you used while testing, so existing images stay valid) | no (runtime) |
| `ADMIN_EMAIL` | The admin's email | no (runtime) |
| `ADMIN_PASSWORD_HASH` | From `npm run hash-password` | no (runtime) |
| `SESSION_SECRET` | 32+ random characters | no (runtime) |
| `REVALIDATE_TOKEN` | 32+ random characters | **yes, and at runtime** |
| `NUXT_PUBLIC_SITE_URL` | Your public address with `https://`, no trailing slash | **yes, and at runtime** |

Two of them matter at build time: `REVALIDATE_TOKEN` is written into the cache configuration, and `NUXT_PUBLIC_SITE_URL` is baked into the static About page (its canonical link and share preview). If you change either, **redeploy**.

Preview deployments get none of these variables, so their Home page shows an error and the admin cannot sign in. That is intended. If you want working previews, add Preview variables that point at a separate test database, never at production.

### Function region

Visitors are served from cache around the world, but the admin, the first load of a page and every cache refresh run in a function that talks to your database. Put it next to the database:

1. In Aiven, open the service and note its **cloud and region** (for example "AWS eu-central-1").
2. In Vercel: **Settings, Functions, Function Region**, and choose the closest one:

| Aiven region | Vercel region |
|---|---|
| AWS us-east-1 (N. Virginia) | `iad1` |
| AWS us-west-2 (Oregon) | `pdx1` |
| AWS eu-west-1 (Ireland) | `dub1` |
| AWS eu-west-2 (London) | `lhr1` |
| AWS eu-central-1 (Frankfurt) | `fra1` |
| AWS ap-south-1 (Mumbai) | `bom1` |
| AWS ap-southeast-1 (Singapore) | `sin1` |
| AWS ap-northeast-1 (Tokyo) | `hnd1` |

For a Google Cloud or Azure service, choose the Vercel region in the same city. Redeploy after changing it.

## 3. Aiven

- [ ] **The service is running.** I believe Aiven's free plan can power a service off when it is idle, but I have not verified that, so check the plan's current terms. If a service can sleep, the first request after a quiet spell can be slow or fail. Cached pages keep serving visitors meanwhile, but the admin and cache refreshes need the database.
- [ ] **CA certificate.** In the service overview, under Connection information, download the **CA certificate** and paste it into `DATABASE_CA_CERT`. The app trusts exactly that certificate and still checks the host name.
- [ ] **Allowed IP addresses.** Leave the default (open to all addresses). Vercel functions do not have fixed IP addresses, so a short allow-list would lock them out. The connection is protected by TLS with the CA above and by the password. Only restrict it if you add Vercel's paid Static IPs.
- [ ] **Connection limit.** Each running function instance opens at most one connection. If Aiven ever reports "too many connections", turn on **Connection pooling** in Aiven and use the pooler's connection string as `DATABASE_URL` (test the site after switching).
- [ ] **Tables exist in the PRODUCTION database.** Run `npx prisma migrate deploy` against it (the safe one-off command is in the [guide, section 4.2](deployment-guide.md#42-applying-migrations-to-production-the-safe-way)), and check the host Prisma prints is the production host. Then `/api/health` on the live site must say `{"database":"up"}`.
- [ ] **Backups.** Confirm the plan includes backups, and that you know how to restore one.

## 4. Deploy and check

Deploy, then check each of these on the live address:

- [ ] `/api/health` answers `{"database":"up"}`.
- [ ] Home, About and a project page load, with images, and `/projects/does-not-exist` shows a "Page not found" page.
- [ ] `/admin` and `/api/admin/projects` answer **404** when you are signed out (use a private window).
- [ ] You can sign in, and sign out. A wrong password shows an error, and a sixth wrong try in a minute is refused.
- [ ] **Edit a project title and save.** Reload Home within a few seconds: the change should already be there (that proves `REVALIDATE_TOKEN` works). If it only appears after up to a minute, the token is missing or was added after the build: redeploy. Vercel's function log shows a line starting `[revalidate]` when something is wrong.
- [ ] Upload a cover and a gallery image, reorder, remove one, and confirm the removed one is gone from your Cloudinary folder.
- [ ] `/robots.txt` and `/sitemap.xml` show your real address, and the sitemap lists the published projects.
- [ ] View source on About: the canonical link uses your real address, not `localhost` or `vercel.app`.
- [ ] Paste a project link into a chat app or a social-card checker and confirm the preview shows the cover image.
- [ ] Run Lighthouse on the live Home, About and one project page.

## 5. Custom domain (if you use one)

1. Add the domain in Vercel (Settings, Domains) and set its DNS records.
2. Set `NUXT_PUBLIC_SITE_URL` to `https://your-domain` and **redeploy**.
3. In Google Search Console, add the site and submit `https://your-domain/sitemap.xml`.

## 6. Switching over from the old site

The old Vite site lives on the `main` branch. Merging `nuxt-rebuild` into `main` replaces it in production, so do that last. If something is wrong, use Vercel's **Instant Rollback** on the previous deployment, which takes effect immediately.

## 7. Afterwards

- [ ] Run `npm audit` now and then. At the time of writing it reports two advisories (one in the Prisma command-line tooling, one in Nitro's build tooling), and neither package is part of the deployed site. There is no upgrade that fixes them yet.
- [ ] To change the admin password: `npm run hash-password`, update `ADMIN_PASSWORD_HASH` in Vercel, redeploy. To sign out any open session at once, change `SESSION_SECRET` and redeploy.
