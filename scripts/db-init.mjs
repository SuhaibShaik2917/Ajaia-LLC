#!/usr/bin/env node
// Applies prisma/sql/init.sql to DATABASE_URL using the `pg` driver.
//
// This is the offline fallback for environments where the Prisma schema engine
// binary is unavailable. On a normal machine, prefer `npx prisma db push`.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const target = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!target) {
  console.error("DATABASE_URL (or DIRECT_URL) must be set.");
  process.exit(1);
}

const sql = readFileSync(join(here, "..", "prisma", "sql", "init.sql"), "utf8");
const client = new pg.Client({ connectionString: target });

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied to", target.replace(/:\/\/[^@]*@/, "://***@"));
} catch (error) {
  console.error("Failed to apply schema:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
