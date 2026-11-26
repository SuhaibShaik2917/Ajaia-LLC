#!/usr/bin/env node
/**
 * Deployment diagnostic: finds the Supabase pooler endpoint that serves this
 * project and checks that the app role can read the tables.
 *
 * It runs inside the Vercel build (which has outbound network) and prints a
 * single machine-readable line so the deployment logs answer the question
 * "which host should DATABASE_URL use?".
 *
 *   PROBE_DB_PASSWORD=... node scripts/db-probe.mjs
 *
 * Always exits 0 — it is a diagnostic, never a build gate.
 */
import dns from "node:dns/promises";
import pg from "pg";

const ref = process.env.PROBE_PROJECT_REF ?? "guhcknrrohedyccyorfo";
const region = process.env.PROBE_REGION ?? "ap-southeast-1";
const password = process.env.PROBE_DB_PASSWORD;
const user = process.env.PROBE_DB_USER ?? `docket_app.${ref}`;

const candidates = [
  `aws-0-${region}.pooler.supabase.com`,
  `aws-1-${region}.pooler.supabase.com`,
  `db.${ref}.supabase.co`,
];

const ports = [6543, 5432];

async function tryEndpoint(host, port) {
  const connectionString = `postgresql://${user}:${encodeURIComponent(password ?? "")}@${host}:${port}/postgres`;
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    const result = await client.query('SELECT count(*)::int AS users FROM "User"');
    await client.end();
    return { ok: true, users: result.rows[0].users };
  } catch (error) {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  console.log(`[db-probe] ref=${ref} region=${region} user=${user} password=${password ? "set" : "MISSING"}`);

  for (const host of candidates) {
    try {
      const addresses = await dns.resolve4(host).catch(() => []);
      const addresses6 = await dns.resolve6(host).catch(() => []);
      console.log(`[db-probe] DNS ${host} → IPv4 ${addresses.join(",") || "none"} / IPv6 ${addresses6.join(",") || "none"}`);
    } catch (error) {
      console.log(`[db-probe] DNS ${host} → error ${error instanceof Error ? error.message : error}`);
    }

    for (const port of ports) {
      const result = await tryEndpoint(host, port);
      if (result.ok) {
        console.log(`[db-probe] RESULT_OK host=${host} port=${port} users=${result.users}`);
        console.log(`[db-probe] SUGGESTED_DATABASE_URL=postgresql://${user}:<password>@${host}:${port}/postgres`);
        return;
      }
      console.log(`[db-probe] FAIL host=${host} port=${port} :: ${result.error?.split("\n")[0]}`);
    }
  }

  console.log("[db-probe] RESULT_NONE — no candidate endpoint accepted the credentials");
}

main()
  .catch((error) => console.log(`[db-probe] crashed: ${error instanceof Error ? error.message : error}`))
  .finally(() => process.exit(0));
