# AI build log

Chronological record of this session. "Time" is the wall-clock spent in the
phase in this environment (including verification), not a target. Only what
actually happened is recorded.

Environment facts that shaped the build:

- Repository started empty (a one-line `README.md` on `main`).
- No managed Postgres or credentials were available, and outbound network was
  limited to GitHub and npm. A real PostgreSQL 19 server was started locally from
  embedded binaries installed **outside** the repo (`/tmp`), so the app and the
  test suite run against genuine Postgres.
- `binaries.prisma.sh` is unreachable, which drove the Prisma decisions below.
- No browser binary could be launched, so UI checks were build-level plus jsdom.

---

## Phase 1 — Scaffold (~10 min)

**Prompt intent:** Next 14 App Router + TS + Tailwind + Tiptap + Prisma + Vitest,
pinned dependencies, `.env.example`, `.gitignore`.

**Did:**
- Wrote `package.json`, `tsconfig.json` (path alias `@/*`), Tailwind/PostCSS
  config, ESLint config, `.gitignore`, `.env.example`.
- Installed pinned dependencies; generated `AUTH_SECRET` into `.env`.
- Verified `.env` is ignored (`git check-ignore .env`).

**Changed course:** none yet — but `npm install` failed on `prisma generate`
(network), which set up the Phase 2 investigation.

**Verified:** `npm install` (with `--ignore-scripts`), files in place.

## Phase 2 — Database + seed (~25 min, over budget)

**Did:**
- `prisma/schema.prisma` exactly as specified (User, Document, DocumentShare,
  `ShareRole`, index on `(ownerId, updatedAt DESC)`).
- `src/lib/db.ts`: Prisma singleton.
- `prisma/seed.ts`: 4 users (bcrypt cost 10, shared password), 5 documents
  (one richly formatted with H1/H2/H3, bold/italic/underline, bullet + ordered
  lists), 2 shares (Bob Viewer, Carol Editor), idempotent via upsert with stable ids.

**Rejected:** Prisma 5.22 (needs Rust engines + schema engine from
`binaries.prisma.sh`), then Prisma 8 RC (no `generate` command; client RC not
published). **Adopted** Prisma 7.10.1 with `@prisma/adapter-pg` + `pg`, and moved
`url`/`directUrl` into `prisma.config.ts` because Prisma 7 rejects them in the schema.

**Fallback:** `prisma/sql/init.sql` + `scripts/db-init.mjs` (`npm run db:init`) to
create the schema without the schema-engine binary; `scripts/sandbox-shim-prisma.sh`
answers the CLI's `--version` probe so `prisma generate` runs offline.

**Verified:** `prisma validate` clean; `npm run db:init` twice (idempotent);
`npm run db:seed` twice → still 4 users / 5 documents / 2 shares.

## Phase 3 — Auth (~20 min)

**Did:** `src/lib/session.ts` (edge-safe JWT sign/verify), `src/lib/auth.ts`
(cookie attach/clear, `requireUser`, `getCurrentUser`), `src/lib/errors.ts`
(`AppError` + `handleError`), login/logout/me routes, `middleware.ts`,
`/login` page with demo-account chips and inline errors, in-memory login rate
limiter (P1, added early because it is tiny).

**Verified with curl:** wrong password → `401` generic message; correct → `200` +
`docket_session` cookie; `/api/documents` without cookie → `401`; `/` while
logged out → `307 /login`.

## Phase 4 — Documents API + permissions (~30 min)

**Did:** `validation.ts` (Zod schemas, 1–200 title, 2 MB content, 1 MB import),
`types/index.ts`, `services/permissions.ts` (the single permission decision),
`services/documents.ts`, document routes with 409/413 handling.

**Correction:** `parseJsonBody<T>(request, ZodType<T>)` inferred Zod *input*
types, so transformed Tiptap content did not typecheck; the helper now takes a
structural `{ parse(input: unknown): T }`.

**Verified with curl:** create/patch/get/list as Alice; version increments to 2;
Bob 404 on a private document; Bob (Viewer) GET 200 / PATCH 403; stale
`baseVersion` → 409; empty patch → 400 with `fields.title`.

## Phase 5 — Dashboard UI (~20 min)

**Did:** `AppShell` (sidebar + mobile drawer + import dialog context),
`Sidebar`, `MobileNav`, `DashboardPage` with `?view=owned|shared`, skeletons,
empty state, error state with retry, search, timestamps, role badges, owner name,
delete confirm dialog (P1).

**Verified:** `next build` compiles all routes; dashboard HTML is served with the
shell; Bob's shared list contains Alice's document with role VIEWER (API-verified).

## Phase 6 — Editor + autosave (~30 min)

**Did:** Tiptap editor component with `immediatelyRender: false`, sticky toolbar
(B/I/U, block select, bullet/ordered lists, active states, `aria-label`s),
`SaveStatus` pill, `TitleInput`, `useAutosave` (1s debounce, single in-flight,
dirty flag, backoff retry, `beforeunload` keepalive, 409 conflict), read-only mode
for viewers, page-wide prose styles.

**Corrections:** editor remount key tied to save version (would drop the caret);
sidebar highlight relied on `pathname` (stale for `?view=`); delete button was
hover-only (unusable on touch).

**Verified:** rich-text round-trip test deep-equals after PATCH → GET; a shared
extension set renders all six formats to HTML; autosave behaviour covered by five
jsdom tests.

## Phase 7 — Import (~15 min)

**Did:** `import/convert.ts` (extension allow-list, size, null bytes, fatal UTF-8
decode, `.txt` paragraphs + hard breaks, `.md` via `marked` → `generateJSON`),
`/ api/documents/import` with Origin check, `ImportDialog` (drop zone, file
picker, filename + size, inline error, navigate on success).

**Discovery:** `__x__` in markdown is CommonMark bold, not underline — documented
in README and asserted in a test instead of inventing a non-standard mapping.

**Verified with curl:** `.md` → heading/bold/bullet/ordered nodes; `.txt` →
paragraph + hardBreak; `.pdf` 400; empty 400; >1 MB 413; Latin-1 bytes 400;
cross-origin 403; unauthenticated 401.

## Phase 8 — Sharing (~25 min)

**Did:** `services/shares.ts` (list/upsert/change/revoke, owner-only, self-share
and unknown-email errors), share routes, `ShareDialog` (email + datalist, role
select, collaborator list with inline role change and remove, inline errors),
role badges on shared rows.

**Verified with curl (Alice ↔ Bob ↔ Carol ↔ Dave):** share 200; role change 200;
viewer 403 → editor 200 after promotion; revoke → 404; non-owner 403;
`USER_NOT_FOUND` 404; `CANNOT_SHARE_WITH_SELF` 400.

## Phase 9 — Tests (~30 min)

**Did:** Vitest config with a real-Postgres test database, global setup that
applies the bootstrap SQL, per-test truncation, a helper that signs a session and
builds `NextRequest` objects so route handlers are exercised directly. 44 tests
in 7 files (documents, permissions, import, content, format, autosave, toolbar).

**Corrections:** the init SQL was not idempotent for the enum type (fixed with a
`DO` block); the include glob silently skipped `.tsx` suites; Vitest needed
`esbuild.jsx = "automatic"`.

**Verified:** `npm test` → 7 files / 44 tests passed.

## Phase 10 — Deploy (~35 min, resumed after Supabase + Vercel were connected)

**Attempted first, blocked:** the sandbox has no outbound network to `api.vercel.com`,
`*.supabase.com` or `*.vercel.app`, so deployment moved to the Supabase and Vercel
connectors and every check that needed real traffic ran *inside a Vercel build*.

**Did:**
1. Supabase: applied the schema, seeded 4 users / 5 documents / 2 shares, enabled RLS on
   all three tables, created the least-privilege role `docket_app`, and revoked every
   grant from `anon`/`authenticated`.
2. Wrote `scripts/db-probe.mjs` to answer the one unknown the connectors could not: which
   pooler host this project lives on. Run as the first build step it printed
   `FAIL aws-0 … tenant/user docket_app.<ref> not found` and
   `RESULT_OK host=aws-1-ap-southeast-1.pooler.supabase.com port=6543 users=4`.
   Also learned `db.<ref>.supabase.co` is IPv6-only → unusable from Vercel functions.
3. Vercel: project `docket` (framework `nextjs`), env `DATABASE_URL`/`DIRECT_URL`
   (pooler `aws-1`, `:6543` / `:5432`) and `AUTH_SECRET`; build command left at
   `npm run build`. Deployed from the branch with `create_deployment` (`git_source` with
   `repoId` — the account has no GitHub integration, so `create_project(git_repository)`
   fails with 400 and the repository is deployed per-deployment instead).
4. First live smoke run failed 2/8: `/login` → `302` to `vercel.com/sso-api`, login → `401`.
   Wrote `scripts/probe-prod.mjs`, which showed the `302` + `_vercel_sso_nonce` cookie —
   **Deployment Protection**, not an app bug. Asked the owner to disable Vercel
   Authentication for the project (no connector tool exposes protection settings).
5. Re-ran probe + smoke as a Vercel build step: `/login 200`, `/api/auth/me 401 JSON`,
   then **`24/24 checks passed`** against https://docket-suhaibshaik2917.vercel.app.

**Rejected/corrected:** guessed `aws-0` pooler (rejected by the DB itself); setting
`NODE_ENV=production` in the project env (would drop `devDependencies` and break
`prisma generate` — instead `prisma`/`dotenv` were moved to `dependencies`); a GitHub
Actions smoke workflow (workflow_dispatch is not registered until the file is on the
default branch, so the build-step harness was used instead).

## Phase 11 — Docs (~20 min)

**Did:** `README.md`, `ARCHITECTURE.md` (Mermaid request/ER/sequence/import
diagrams, permission matrix, decisions and trade-offs, assumptions),
`AI_WORKFLOW.md` (tools, prompts, real corrections, verification, debugging),
`SUBMISSION.md`, `VIDEO_URL.txt`, `AGENTS.md`, this log. Every claim was checked
against the code or a command output.

## Phase 12 — Final verification (~10 min)

**Did:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, seed a
clean database, re-run the API smoke matrix, review `git status` for secrets.

**Result:** all green; no `.env` or secrets committed; `.env.example` present.

## Phase 13 — Post-deploy verification (~10 min)

**Did:** `node scripts/probe-prod.mjs` + `node scripts/smoke-prod.mjs` executed against the
production URL from inside a Vercel build; updated `README.md` (live URL, real
deployment settings, the two traps: pooler hostname and Deployment Protection),
`ARCHITECTURE.md` §9 (production topology), `SUBMISSION.md` (live row, acceptance row
❌→✅, limitations, video script beat) and this log.

**Result:** `24/24 checks passed`; production build READY; local gates still green.
