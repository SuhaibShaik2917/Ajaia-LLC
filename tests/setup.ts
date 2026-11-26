import { config } from "dotenv";

config();

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is required for the test suite.");
}

// Route handlers and services read DATABASE_URL via src/lib/db.ts, so the test
// database is injected here, before any module is imported.
process.env.DATABASE_URL = testUrl;
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.AUTH_SECRET ??= "test-secret-key-for-vitest-only-0123456789";
