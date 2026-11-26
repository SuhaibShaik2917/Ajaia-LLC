#!/usr/bin/env node
/**
 * Diagnostic probe — prints status, key headers and a body snippet for the
 * endpoints the smoke test relies on. Used to explain a failing deploy without
 * shell access to the deployment.
 *
 *   node scripts/probe-prod.mjs https://your-app.vercel.app
 */
const base = (process.argv[2] ?? process.env.PROBE_BASE_URL ?? "").replace(/\/+$/, "");
if (!base) {
  console.error("Usage: node scripts/probe-prod.mjs https://your-app.example.com");
  process.exit(2);
}

const interesting = [
  "location",
  "www-authenticate",
  "server",
  "x-vercel-id",
  "x-vercel-mitigated",
  "x-matched-path",
  "content-type",
  "set-cookie",
];

async function show(label, path, init) {
  let response;
  try {
    response = await fetch(base + path, { ...init, redirect: "manual" });
  } catch (error) {
    console.log(`\n=== ${label} (${path}) THREW ${error}`);
    return;
  }
  console.log(`\n=== ${label}  ${init?.method ?? "GET"} ${path} -> ${response.status}`);
  for (const name of interesting) {
    const value = response.headers.get(name);
    if (value) console.log(`    ${name}: ${value.slice(0, 200)}`);
  }
  const body = await response.text();
  console.log(`    body[0..400]: ${body.replace(/\s+/g, " ").slice(0, 400)}`);
}

await show("login page", "/login");
await show("me without cookie", "/api/auth/me");
await show("me with junk cookie", "/api/auth/me", { headers: { cookie: "docket_session=junk" } });
await show("login post", "/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "alice@demo.test", password: "Demo@1234" }),
});
await show("root without cookie", "/");
process.exit(0);
