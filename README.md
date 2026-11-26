# Docket

A deliberately small, sharp-edged document workspace for the Ajaia LLC
AI-Native Full Stack assessment: **write, format, autosave, import and share**
documents with roles the server actually enforces.

- **Repo:** https://github.com/SuhaibShaik2917/Ajaia-LLC (branch `arena/b8fb2d87-ajaia-llc`)
- **Live URL:** _not deployed from this build environment — see [Deployment](#deployment)._
  The app runs locally with two commands and the repository is deployment-ready.
- **Demo video:** `VIDEO_URL.txt` (placeholder to be filled after recording)

---

## What works

**P0 — complete**

| Area | Detail |
| --- | --- |
| Auth | Demo-user login/logout, HS256 JWT in an httpOnly + Secure (in production) + SameSite=Lax cookie, 7-day session, session survives refresh |
| Documents | Create, rename, edit, autosave, reopen; content persists in Postgres; created + updated timestamps; version counter |
| Editor | Bold, italic, underline, H1–H3, bullet list, numbered list; active states; `aria-label` on every control |
| Autosave | 1s debounce, one in-flight request, dirty-again flag, retry with backoff, flush on `beforeunload`, save-status pill (`Saving…` / `Saved just now` / `Save failed – Retry` / `Read-only`) |
| Dashboard | *My documents* and *Shared with me* (`?view=`), role badges, owner name on shared rows, skeleton, empty and error states |
| Import | `.txt` and `.md` → new document, max 1 MB, UTF-8 only; rejects wrong type, empty files, invalid encoding, oversize |
| Sharing | Share by email as Viewer/Editor, change role, revoke; owner-only management |
| Permissions | Viewer read-only in the UI **and** 403 from the API; unshared users get 404; unauthenticated requests get 401 |
| Quality | 44 Vitest tests against a real Postgres, `tsc --noEmit` clean, `next build` clean, ESLint clean |

**P1 — complete:** delete document (owner only, confirm dialog), version-conflict
409 with a reload banner, toasts, mobile drawer navigation, dashboard search,
login rate limiting (in-memory, 8 attempts / 15 min per email).

**P2 — not started (out of scope by design):** DOCX import, export, comments,
version history, real-time collaboration.

---

## Quick start

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env
#    edit .env: DATABASE_URL, DIRECT_URL, AUTH_SECRET
#    generate a secret with: openssl rand -base64 32

# 3. create tables and demo data
npx prisma db push        # or: npm run db:init   (see "Offline / sandbox note")
npm run db:seed           # idempotent — safe to run repeatedly

# 4. run
npm run dev               # http://localhost:3000
```

Then sign in with a demo chip on `/login` (one click fills and submits).

**No Postgres yet?** `./scripts/dev-postgres.sh` starts a disposable local cluster
(Linux x64; installs the npm-packaged binaries with `--no-save`, data in
`.devdb/`) and prints the `DATABASE_URL` values to use. It creates both `docket`
and `docket_test`.

### Demo accounts

All demo users share the password **`Demo@1234`**.

| Email | Name | Seeded state |
| --- | --- | --- |
| `alice@demo.test` | Alice Anderson | Owns 4 documents (one richly formatted, one blank) |
| `bob@demo.test` | Bob Bennett | Owns 1 document; **Viewer** on Alice's "Product launch checklist" |
| `carol@demo.test` | Carol Chen | **Editor** on Alice's "Q3 hiring plan" |
| `dave@demo.test` | Dave Diaz | No shares — use to verify 404s |

---

## Environment variables

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | app runtime (`src/lib/db.ts`) | Pooled Postgres URL. Supabase pooler: port `6543` with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | yes | Prisma CLI, seed, `db:init` | Direct connection, port `5432` (no pooler) |
| `AUTH_SECRET` | yes | JWT signing | ≥ 16 chars; `openssl rand -base64 32` |
| `TEST_DATABASE_URL` | tests only | Vitest | Disposable database; the suite truncates tables between tests |
| `APP_ORIGIN` | optional | CSRF check | Extra allowed origin for multipart import (e.g. a custom domain) |

`.env` is git-ignored; `.env.example` is committed. Nothing secret is exposed to
the browser — every env var is read on the server only.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | `prisma generate && next build` |
| `npm start` | Production server (`next start`) |
| `npm test` | Vitest suite (needs `TEST_DATABASE_URL`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run db:push` | `prisma db push` — sync schema to the database |
| `npm run db:seed` | Seed demo users/documents/shares (idempotent) |
| `npm run db:init` | Apply `prisma/sql/init.sql` with `pg` (fallback, see below) |
| `node scripts/smoke-prod.mjs <url>` | End-to-end acceptance smoke test against a running app (local or deployed) |

---

## Testing

```bash
# point at a disposable database — never production
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docket_test"
npm test
```

The suite applies `prisma/sql/init.sql`, truncates all tables before each test and
calls the **real route handlers** with a signed session cookie injected, against a
real Postgres. 44 tests across 7 files:

| File | Covers |
| --- | --- |
| `tests/documents.test.ts` | create defaults + owner, title trimming, update persistence + version bump, 409 stale version, malformed JSON/bad content, owned vs shared listings, 401s, owner delete |
| `tests/permissions.test.ts` | role ranking, viewer GET 200 / PATCH 403 with DB unchanged, role change → edit allowed, revoke → 404, strangers 404 on GET/PATCH/DELETE, non-owner cannot list/add/revoke shares, share upsert, unknown email, self-share, invalid role |
| `tests/import.test.ts` | markdown → heading/bold/italic/lists, `<script>` stripped, `.txt` paragraphs + hard breaks, title from filename, `.pdf`/empty/oversize/invalid-UTF-8 rejection, 401, cross-origin rejection |
| `tests/content.test.ts` | rich-text round-trip (bold/italic/underline/H2/bullets/ordered) deep-equal, nested lists + H1–H3, 2 MB content limit → 413 |
| `tests/format.test.ts` | one shared extension set renders every toolbar format, markdown imports render identically |
| `tests/autosave.test.tsx` | debounce coalescing, single in-flight + dirty flush, 409 conflict state, retry/backoff then manual retry, read-only never saves |
| `tests/toolbar.test.tsx` | every toolbar control maps to the right Tiptap command, active/disabled states |

---

## API

All bodies are JSON. Errors are always
`{ "error": { "code": string, "message": string, "fields"?: object } }`.
Every route except `POST /api/auth/login` requires a valid session cookie.

| Method + route | Purpose | Permission | Success | Failures |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login` | Login | public | `200 {user}` + cookie | `400`, `401`, `429` (rate limited) |
| `POST /api/auth/logout` | Clear cookie | any | `204` | — |
| `GET /api/auth/me` | Current user | session | `200 {user}` | `401` |
| `GET /api/users` | Share autocomplete | session | `200 {users[]}` | `401` |
| `GET /api/documents` | Dashboard | session | `200 {owned[], shared[]}` | `401` |
| `POST /api/documents` | Create blank | session | `201 {document}` | `400`, `401` |
| `GET /api/documents/:id` | Fetch | view | `200 {document, myRole}` | `401`, `404` |
| `PATCH /api/documents/:id` | Update title/content | edit | `200 {id, version, updatedAt, title}` | `400`, `401`, `403`, `404`, `409`, `413` |
| `DELETE /api/documents/:id` | Delete | owner | `204` | `401`, `403`, `404` |
| `POST /api/documents/import` | Import multipart `file` | session | `201 {document}` | `400`, `401`, `403`, `413` |
| `GET /api/documents/:id/shares` | List collaborators | owner | `200 {shares[]}` | `401`, `403`, `404` |
| `POST /api/documents/:id/shares` | Share / upsert by email | owner | `200 {share}` | `400`, `401`, `403`, `404` |
| `PATCH /api/documents/:id/shares/:userId` | Change role | owner | `200 {share}` | `400`, `401`, `403`, `404` |
| `DELETE /api/documents/:id/shares/:userId` | Revoke | owner | `204` | `401`, `403`, `404` |

Permission ranking: **OWNER > EDITOR > VIEWER**. `view` ≥ VIEWER, `edit` ≥ EDITOR,
`owner` = OWNER. No access returns 404 so document existence never leaks.

---

## Deployment (Vercel + Supabase)

1. **Supabase** → new project → *Project settings → Database*:
   - pooler URI (port `6543`) → `DATABASE_URL`, append
     `?pgbouncer=true&connection_limit=1`
   - direct URI (port `5432`) → `DIRECT_URL`
2. Create the schema and demo data from your machine, using the **direct** URL:

   ```bash
   DIRECT_URL="postgresql://…:5432/postgres" DATABASE_URL="postgresql://…:5432/postgres" npx prisma db push
   DIRECT_URL="postgresql://…:5432/postgres" DATABASE_URL="postgresql://…:5432/postgres" npm run db:seed
   ```

3. **Vercel** → import the repository → set `DATABASE_URL`, `DIRECT_URL`,
   `AUTH_SECRET`, `NODE_ENV=production` → deploy. The build command already runs
   `prisma generate`.
4. Smoke test the deployment (no dependencies, 24 checks):

   ```bash
   node scripts/smoke-prod.mjs https://your-app.vercel.app
   ```

   It logs in as Alice/Bob/Dave, creates and formats a document, reloads it,
   imports `.md`, rejects a `.pdf`, shares with Bob (Viewer → 403 on write),
   promotes him to Editor (200 on write), checks Dave gets 404, revokes, deletes
   and cleans up. Exit code 0 = all green. The same flow can be walked by hand in
   a browser: Alice → create/format → refresh → import → share with Bob as Viewer
   → Bob in a private window sees read-only → Dave gets 404.

**Render fallback:** same repository, same Supabase database — set the same four
environment variables, build `npm run build`, start `npm start`.

### Offline / sandbox note

Prisma 7 needs no Rust query engine (it uses the `@prisma/adapter-pg` driver), but
the **schema-engine binary** is still downloaded from `binaries.prisma.sh` by
`prisma db push` / `prisma generate` version checks. In this build sandbox that
host is unreachable, so:

- `prisma/sql/init.sql` + `npm run db:init` create exactly the same schema with
  `pg` — used for local runs and the test suite.
- `scripts/sandbox-shim-prisma.sh` writes a stub that only answers `--version`
  so `prisma generate` can run offline.

On a normal machine with network access, ignore both and use `npx prisma db push`.

---

## Project structure

```
prisma/            schema.prisma, seed.ts, sql/init.sql
src/middleware.ts  page redirects (never the security boundary)
src/app/           (app) dashboard + documents/[id], login, api/**/route.ts
src/components/    ui/, layout/, dashboard/, editor/, share/, import/
src/lib/           db, auth, session, errors, validation, http, api-client,
                   services/{permissions,documents,shares}, import/convert,
                   editor/extensions, hooks/useAutosave, format, rate-limit
src/types/         shared DTO types
tests/             Vitest suites + helpers
```

---

## Known limitations

- **No real-time collaboration.** Concurrent edits are last-write-wins with a
  `version` counter; a stale `baseVersion` returns 409 and the editor offers
  *Reload latest* (unsaved edits are discarded after reload).
- **Markdown has no underline.** `.md` import maps `__x__` to bold (CommonMark);
  underline exists only in the editor and in JSON content.
- **Demo users only**, shared password, no sign-up, no password reset.
- Login rate limiting is per process (in-memory), so it is per Vercel instance.
- `.txt`/`.md` only; no DOCX/XLSX/PDF import and no export.
- Text content only — no images, tables, comments or version history.
- Imported markdown is normalised by the Tiptap schema; exotic HTML is dropped.
- Desktop-first layout; verified responsive behaviour at 375 px by CSS review
  (sidebar becomes a drawer), not by automated visual tests.

---

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — diagrams, data model, permission model, decisions
- [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) — how AI was used, what was rejected, how it was verified
- [`SUBMISSION.md`](./SUBMISSION.md) — links, status matrix, video script, known issues
- [`AGENTS.md`](./AGENTS.md) — working agreement and file map for future agents
- [`ai-log.md`](./ai-log.md) — chronological build log
