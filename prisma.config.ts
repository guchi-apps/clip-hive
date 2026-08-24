// Prisma CLI (migrate/generate/studio) does not auto-load `.env.local` the way
// Next.js does — it only auto-loads `.env`. Load it explicitly here so
// `prisma migrate dev` etc. see the same DATABASE_URL as `next dev`.
//
// `quiet: true` is required: dotenv v17 prints a tip banner to stdout, and
// `prisma migrate dev` / `migrate diff --script` write the generated SQL to the
// same stdout — without it the banner ends up as the first line of
// `migration.sql` and breaks `prisma migrate deploy` in production.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
