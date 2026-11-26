// Prisma 7 configuration.
// Prisma 7 uses a Rust-free client driven by a driver adapter (see src/lib/db.ts),
// so the schema engine binary is only needed for `prisma db push` / migrations.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI must talk to Postgres directly (not through pgbouncer),
    // so prefer DIRECT_URL when it is configured.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
