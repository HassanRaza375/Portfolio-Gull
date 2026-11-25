# Reference only: plan from the Hisaab project

This was written for another project (Hisaab: Nuxt on Vercel, Aiven, Cloudinary). It is kept here as a reference for this portfolio. The pages below are examples; see `../README.md` for how they map to this project.

Here is a plan for the new project, assuming the same stack as Hisaab (Nuxt on Vercel). If you use something else, the same design applies with different file names.

## Pages and routes
| Area | Page | Type |
|---|---|---|
| Public | Page 1 and Page 2 | Static: no server data, prerendered at build time |
| Public | Page 3 | Dynamic: reads from the database at request time (or cached for a short time) |
| Admin | `/admin/login` | Public form |
| Admin | Three admin pages, for example `/admin`, `/admin/<page2>`, `/admin/<page3>` | Only for the signed-in admin |

Server routes: `POST /api/admin/login`, `POST /api/admin/logout`, plus a small `/api/admin/*` set for the three pages' data. Public page 3 reads through one public read-only route, with no write routes.

## One admin, no user table
- **Credentials:** `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` as Vercel variables. Make the hash once on your own machine with Node's built-in `scrypt` (with a random salt), so no plain password is ever stored. Compare with `timingSafeEqual`.
- **Session:** after a correct login, the server sets a signed cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, about 7 days) using `SESSION_SECRET` (32+ random characters). The cookie holds only an expiry and a signature. Check it with an HMAC.
- **Guard:** every admin route and page starts with the same check. Anyone without a valid cookie gets a 404 for `/api/admin/*` (not a 401), as in Hisaab, so strangers can't tell the admin area exists.
- **Login limit:** for example 5 tries per minute per address, plus a short delay after each wrong password. Use a database row (as Hisaab does) because serverless instances share no memory.
- **Writes:** only the same-origin check plus the cookie check. It's the same simple CSRF defence Hisaab uses.
- **Changing the password:** generate a new hash locally and update the Vercel variable. That signs nobody else out, and there is nobody else.

## Data and files
- **Aiven:** one database (new, not Hisaab's), copy `dbConfig.ts`, `db.ts` and `prisma.config.ts` unchanged. Tables are only for your own content, plus a `LoginAttempt` table for the limit.
- **Cloudinary:** one folder, for example `CLOUDINARY_FOLDER=otherproject`.
  - Public images: `type: "upload"`.
  - Private files: `type: "authenticated"` with 5-minute signed links, generated only after the admin check.
  - Upload through an admin route, validating the file bytes and size as in the guide.

## Environment variables (all Production-only in Vercel)
`DATABASE_URL`, `DATABASE_CA_CERT`, `CLOUDINARY_URL`, `CLOUDINARY_FOLDER`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`.
You don't need `BETTER_AUTH_*`, a sync flag, or seed variables.

## Build order
1. Project, database, `/api/health` (check `"database":"up"`).
2. Migration applied from your machine.
3. The login route, the cookie and the admin guard, with tests that a signed-out visitor gets 404 on every admin route.
4. The three admin pages, then public page 3, then the two static pages.
5. Cloudinary upload and signed links, if the project needs them.
6. A short checklist before going live: accessible labels on every control, no secrets in the repo or logs, and the function region set next to the database.

If you tell me what the three pages and the dynamic page show, I can turn this into a file-by-file task list, or write the login and guard code as a starter you can copy into the new repo.
