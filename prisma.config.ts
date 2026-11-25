// Prisma 7 CLI configuration. Prisma 7 does not load .env itself; Node's own loader does it here, for the developer's `prisma migrate` commands only,
// and never overrides a variable that is already set. `prisma generate` needs no database, so a missing DATABASE_URL is allowed (a clean `npm ci` runs
// generate in postinstall without one). The file is never opened or printed by an assistant.
import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  /* no .env: the variables may already be set */
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
