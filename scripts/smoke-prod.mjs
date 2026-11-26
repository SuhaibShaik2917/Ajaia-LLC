#!/usr/bin/env node
/**
 * Production smoke test — runs the acceptance flow against a deployed URL (or
 * localhost) over plain HTTP, with no dependencies.
 *
 *   node scripts/smoke-prod.mjs https://your-app.vercel.app
 *
 * It logs in as Alice, Bob and Dave, creates and formats a document, reloads it,
 * imports markdown, shares it, asserts the permission matrix, then cleans up
 * after itself (revoke + delete). Exit code 0 means every check passed.
 */
const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "").replace(/\/+$/, "");
const password = process.env.SMOKE_PASSWORD ?? "Demo@1234";

if (!base) {
  console.error("Usage: node scripts/smoke-prod.mjs https://your-app.example.com");
  process.exit(2);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail && !ok ? `  → ${detail}` : ""}`);
}

function session() {
  let cookie = "";
  return {
    async request(path, init = {}) {
      const headers = new Headers(init.headers);
      if (cookie) headers.set("cookie", cookie);
      const response = await fetch(base + path, { ...init, headers, redirect: "manual" });
      const setCookies = response.headers.getSetCookie?.() ?? [];
      for (const value of setCookies) {
        const pair = value.split(";")[0];
        if (pair.startsWith("docket_session=")) cookie = pair;
      }
      return response;
    },
    async json(path, init = {}) {
      const response = await this.request(path, init);
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return { status: response.status, body };
    },
    post(path, body) {
      return this.json(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
    },
    patch(path, body) {
      return this.json(path, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    del(path) {
      return this.json(path, { method: "DELETE" });
    },
    get(path) {
      return this.json(path);
    },
  };
}

const richDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Smoke test heading" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "bold" },
        { type: "text", text: " and " },
        { type: "text", marks: [{ type: "underline" }], text: "underline" },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
      ],
    },
  ],
};

async function main() {
  console.log(`\nSmoke testing ${base}\n`);

  // ---------------------------------------------------------------- auth
  const alice = session();
  const bob = session();
  const dave = session();

  const loginPage = await fetch(`${base}/login`);
  check("GET /login returns 200", loginPage.status === 200, `status ${loginPage.status}`);

  const me = await session().get("/api/auth/me");
  check("GET /api/auth/me without a cookie → 401", me.status === 401, `status ${me.status}`);

  const wrong = await session().post("/api/auth/login", {
    email: "alice@demo.test",
    password: "not-the-password",
  });
  check("Wrong password → 401", wrong.status === 401, `status ${wrong.status}`);

  for (const [name, jar] of [
    ["alice", alice],
    ["bob", bob],
    ["dave", dave],
  ]) {
    const login = await jar.post("/api/auth/login", { email: `${name}@demo.test`, password });
    check(
      `Login as ${name} → 200 + session cookie`,
      login.status === 200 && Boolean(login.body?.user?.email),
      `status ${login.status}`
    );
  }

  const myList = await alice.get("/api/documents");
  check(
    "Alice's dashboard lists owned documents",
    myList.status === 200 && Array.isArray(myList.body?.owned) && myList.body.owned.length > 0,
    `status ${myList.status}`
  );

  // ------------------------------------------------------------ documents
  const created = await alice.post("/api/documents", {});
  const documentId = created.body?.document?.id;
  check(
    "Create document → 201 with default title",
    created.status === 201 && created.body?.document?.title === "Untitled document",
    `status ${created.status}`
  );
  if (!documentId) {
    console.log("\nCannot continue without a document id.");
    return;
  }

  const formatted = await alice.patch(`/api/documents/${documentId}`, {
    title: "Smoke test document",
    content: richDoc,
    baseVersion: 1,
  });
  check(
    "Rename + rich text PATCH → version 2",
    formatted.status === 200 && formatted.body?.version === 2,
    `status ${formatted.status} body ${JSON.stringify(formatted.body)}`
  );

  const reloaded = await alice.get(`/api/documents/${documentId}`);
  const content = JSON.stringify(reloaded.body?.document?.content ?? {});
  check(
    "Reload keeps title, heading, bold, underline and bullet list",
    reloaded.status === 200 &&
      reloaded.body?.document?.title === "Smoke test document" &&
      content.includes('"heading"') &&
      content.includes('"bold"') &&
      content.includes('"underline"') &&
      content.includes("bulletList"),
    `status ${reloaded.status}`
  );

  // --------------------------------------------------------------- import
  const markdown = "# Imported heading\n\nSome **bold** text.\n\n- first\n- second\n";
  const form = new FormData();
  form.append("file", new Blob([markdown], { type: "text/markdown" }), "smoke-import.md");
  const imported = await alice.json("/api/documents/import", { method: "POST", body: form });
  const importedId = imported.body?.document?.id;
  check(
    "Import .md → 201, title from filename",
    imported.status === 201 && imported.body?.document?.title === "smoke-import",
    `status ${imported.status}`
  );

  const badForm = new FormData();
  badForm.append("file", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "smoke.pdf");
  const badImport = await alice.json("/api/documents/import", { method: "POST", body: badForm });
  check(
    "Import .pdf → 400 INVALID_FILE_TYPE",
    badImport.status === 400 && badImport.body?.error?.code === "INVALID_FILE_TYPE",
    `status ${badImport.status}`
  );

  // -------------------------------------------------------------- sharing
  const shared = await alice.post(`/api/documents/${documentId}/shares`, {
    email: "bob@demo.test",
    role: "VIEWER",
  });
  const bobId = shared.body?.share?.userId;
  check(
    "Share with bob@demo.test as VIEWER",
    shared.status === 200 && shared.body?.share?.role === "VIEWER" && Boolean(bobId),
    `status ${shared.status}`
  );

  const bobList = await bob.get("/api/documents");
  check(
    "Bob sees the document in 'Shared with me'",
    bobList.status === 200 &&
      (bobList.body?.shared ?? []).some((item) => item.id === documentId && item.role === "VIEWER"),
    `status ${bobList.status}`
  );

  const bobRead = await bob.get(`/api/documents/${documentId}`);
  check(
    "Bob (Viewer) can read the document",
    bobRead.status === 200 && bobRead.body?.myRole === "VIEWER",
    `status ${bobRead.status}`
  );

  const bobWrite = await bob.patch(`/api/documents/${documentId}`, { title: "hacked" });
  check("Bob (Viewer) PATCH → 403", bobWrite.status === 403, `status ${bobWrite.status}`);

  if (bobId) {
    const promoted = await alice.patch(`/api/documents/${documentId}/shares/${bobId}`, {
      role: "EDITOR",
    });
    check(
      "Change Bob's role to EDITOR",
      promoted.status === 200 && promoted.body?.share?.role === "EDITOR",
      `status ${promoted.status}`
    );

    const bobEdit = await bob.patch(`/api/documents/${documentId}`, { title: "Edited by Bob" });
    check("Bob (Editor) PATCH → 200", bobEdit.status === 200, `status ${bobEdit.status}`);
  }

  const daveRead = await dave.get(`/api/documents/${documentId}`);
  const daveWrite = await dave.patch(`/api/documents/${documentId}`, { title: "nope" });
  const daveDelete = await dave.del(`/api/documents/${documentId}`);
  check(
    "Dave (unshared) GET/PATCH/DELETE → 404",
    daveRead.status === 404 && daveWrite.status === 404 && daveDelete.status === 404,
    `statuses ${daveRead.status}/${daveWrite.status}/${daveDelete.status}`
  );

  const nonOwnerShares = await bob.get(`/api/documents/${documentId}/shares`);
  check("Non-owner listing shares → 403", nonOwnerShares.status === 403, `status ${nonOwnerShares.status}`);

  // -------------------------------------------------------------- cleanup
  if (bobId) {
    const revoked = await alice.del(`/api/documents/${documentId}/shares/${bobId}`);
    check("Revoke Bob's access → 204", revoked.status === 204, `status ${revoked.status}`);
    const afterRevoke = await bob.get(`/api/documents/${documentId}`);
    check("Bob after revoke → 404", afterRevoke.status === 404, `status ${afterRevoke.status}`);
  }

  if (importedId) {
    await alice.del(`/api/documents/${importedId}`);
  }
  const deleted = await alice.del(`/api/documents/${documentId}`);
  check("Owner deletes the document → 204", deleted.status === 204, `status ${deleted.status}`);
  const gone = await alice.get(`/api/documents/${documentId}`);
  check("Deleted document → 404", gone.status === 404, `status ${gone.status}`);
}

main()
  .catch((error) => {
    console.error("\nSmoke test crashed:", error instanceof Error ? error.message : error);
    results.push({ name: "unexpected crash", ok: false, detail: String(error) });
  })
  .finally(() => {
    const failed = results.filter((result) => !result.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    if (failed.length > 0) {
      console.log("Failed checks:");
      for (const item of failed) console.log(`  - ${item.name}${item.detail ? ` (${item.detail})` : ""}`);
      process.exitCode = 1;
    }
  });
