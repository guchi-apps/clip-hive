// Prisma CLI (migrate/generate/studio) does not auto-load `.env.local` the way
// Next.js does — it only auto-loads `.env`. Load it explicitly here so
// `prisma migrate dev` etc. see the same DATABASE_URL as `next dev`.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
