import { execFileSync } from "node:child_process";
import { config } from "dotenv";

/**
 * Applies prisma/sql/init.sql to the test database once per run, so
 * `npm test` works against any empty Postgres instance.
 */
export default function globalSetup() {
  config();

  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Copy .env.example and point it at a disposable Postgres database."
    );
  }
  if (/supabase\.co|render\.com|neon\.tech|amazonaws\.com/.test(testUrl)) {
    throw new Error("Refusing to run destructive tests against a hosted database.");
  }

  execFileSync("node", ["scripts/db-init.mjs"], {
    stdio: "inherit",
    env: { ...process.env, DIRECT_URL: testUrl },
  });
}
