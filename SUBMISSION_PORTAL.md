# Docket — AI-Native Full Stack Developer Assignment

**Candidate:** Shaik Suhaib · suhaibshaik.it@gmail.com

| | |
| --- | --- |
| **Live app** | **https://docket-suhaibshaik2917.vercel.app** |
| **Source** | https://github.com/SuhaibShaik2917/Ajaia-LLC/tree/arena/b8fb2d87-ajaia-llc |
| **Walkthrough video** | `VIDEO_URL.txt` in the repo → replace `PASTE_URL_HERE` with the unlisted Loom/YouTube link |
| **Docs** | [README](https://github.com/SuhaibShaik2917/Ajaia-LLC/blob/arena/b8fb2d87-ajaia-llc/README.md) · [ARCHITECTURE](https://github.com/SuhaibShaik2917/Ajaia-LLC/blob/arena/b8fb2d87-ajaia-llc/ARCHITECTURE.md) · [AI_WORKFLOW](https://github.com/SuhaibShaik2917/Ajaia-LLC/blob/arena/b8fb2d87-ajaia-llc/AI_WORKFLOW.md) · [ai-log](https://github.com/SuhaibShaik2917/Ajaia-LLC/blob/arena/b8fb2d87-ajaia-llc/ai-log.md) |

**Share the demo password:** `Demo@1234` — the login page has one-click chips for every account.

---

## Test accounts

| Email | Seeded role | Use it to see |
| --- | --- | --- |
| `alice@demo.test` | Owns 4 documents | Normal editing, formatting, import, sharing |
| `bob@demo.test` | Owns 1, **Viewer** on Alice's "Product launch checklist" | Read-only UI and a server-side `403` on write |
| `carol@demo.test` | **Editor** on Alice's "Q3 hiring plan" | A non-owner who can edit |
| `dave@demo.test` | No shares | `404` for a document he cannot see |

**60-second tour:** sign in as Alice → open "Product launch checklist" → it is already shared with Bob. Open a private window, sign in as Bob: the same document appears under *Shared with me*, read-only, toolbar disabled. Sign in as Dave: the document does not exist for him.

---

## What it is

A deliberately small Google-Docs-style workspace: create, rename, richly format, autosave, import and share documents, with **roles the server actually enforces**.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Tiptap v2 · Prisma 7 + PostgreSQL (Supabase) · `jose` JWT in an httpOnly cookie · Zod · Vitest.

---

## What works end to end

| Area | Behaviour |
| --- | --- |
| Auth | Login/logout for 4 seeded users; HS256 JWT in an httpOnly, `Secure` (in production), `SameSite=Lax` cookie; 7-day session; survives refresh |
| Documents | Create, rename inline, edit, reopen; `createdAt` / `updatedAt` shown per row and in the editor footer |
| Dashboard | *My documents* and *Shared with me*, title search, created/updated timestamps, mobile drawer |
| Rich text | Bold, italic, underline, H1–H3, bulleted and numbered lists; toolbar reflects active state |
| Autosave | 1 s debounce, single in-flight request, visible `Saving… → Saved just now`, failure state with retry, `409` conflict banner with *Reload latest* |
| Import | `.txt` / `.md` → new editable document; server-side conversion with the editor's own extension set; `.pdf` and oversize files rejected with a clear message; "Supported: .txt, .md (max 1 MB)" shown in the dialog and the README |
| Sharing | Share by email as **Viewer** or **Editor**, change role, revoke; collaborator list with role badges; only the owner can manage shares |
| Permissions | Server-enforced: Viewer `PATCH` → `403` (DB unchanged), non-owner share listing → `403`, unshared document → `404`, no session → `401` |
| Polish | Toasts, delete with confirmation, login rate limiting (8 failures / 15 min → `429`), empty states |

---

## Scope decisions (what I deliberately cut, and why)

The brief said depth over breadth, so the P0 slice is complete and everything else was explicitly deferred:

| Cut | Why |
| --- | --- |
| **Real-time collaboration** | Explicitly out of the brief. Concurrent edits are last-write-wins with optimistic concurrency: a stale `baseVersion` returns `409` and the UI offers *Reload latest* rather than silently overwriting |
| **DOCX import** | `.md`/`.txt` covers the "file upload" requirement with zero extra dependencies; PDFs get an honest, specific error |
| **Comments, version history, export** | Each is a product of its own; none was asked for |
| **Sign-up / password reset / orgs** | The brief allowed seeded accounts; four seeded users demonstrate every permission path, including the negative ones |
| **Undo across sessions** | In-editor undo only — persisted undo needs an event log, which is a different project |

---

## Architecture in one screen

```
Browser (App Router, Tiptap) ──fetch JSON──▶ Route handler ──▶ service ──▶ Prisma ──▶ Postgres
                                              │                 │
                                     verifies cookie      permissions.ts
                                     (never trusts         (the only place
                                      middleware)          roles are decided)
```

Four rules kept the codebase honest:

1. **One permission service.** Every role decision lives in `src/lib/services/permissions.ts`; routes never re-implement it. Not-found and forbidden are handled deliberately: no access → `404` so document existence never leaks.
2. **Every route re-verifies the session.** Middleware only provides the page-level redirect for humans; it is never the security boundary.
3. **All input is parsed by Zod** (`src/lib/validation.ts`), types via `z.infer`, and errors map to a single envelope (`{ error: { code, message, fields? } }`) so the client can branch on `code`.
4. **Shared editor schema.** Import, the client editor and the test suite use the same Tiptap extension list, so imported content can never produce HTML the editor cannot round-trip.

**Autosave** is the most consequential piece of client logic: 1 s debounce, one request in flight at a time, `baseVersion` sent with every write, and the version bump confirmed by the server. That is what makes "two tabs" degrade into a recoverable conflict instead of data loss.

---

## Engineering quality

- **44 automated tests / 7 files** against a real Postgres — the full permission matrix (owner/editor/viewer/stranger/anonymous), content round-trips, import validation, autosave state machine (jsdom), toolbar wiring.
- `npx tsc --noEmit`, `next lint`, `vitest run`, `next build` all green.
- **Acceptance smoke test** (`scripts/smoke-prod.mjs`) drives the live deployment over plain HTTP: login ×3, dashboard, create, rename + rich text, reload, `.md` import, `.pdf` rejection, share, Viewer `403`, promote to Editor `200`, unshared `404`, revoke, delete → **24/24 checks passed** against https://docket-suhaibshaik2917.vercel.app.
- **Deployment:** Vercel (project `docket`, `iad1`) + Supabase Postgres 17 (`ap-southeast-1`), connecting as a least-privilege role `docket_app` with RLS enabled and `anon`/`authenticated` privileges revoked.

Local run is five commands (`README.md → Quick start`); `./scripts/dev-postgres.sh` provisions a throwaway Postgres if you have none.

---

## AI workflow note

**Tools.** Arena.ai Agent Mode (Claude-family agent with shell access) for scaffolding, implementation, tests and docs; the Supabase and Vercel connectors for infrastructure, because the sandbox could not reach either API directly.

**Where AI materially accelerated the work.** Boilerplate that has one correct shape: the Prisma schema, Zod schemas, route handlers, the 44-test permission matrix, and the first draft of every doc. Also diagnosis: the deployment was debugged by writing two tiny diagnostic scripts and running them *inside a Vercel build* (the only place with internet), which turned a mysterious "login returns 401 in production" into a named cause in one run.

**What I changed or rejected.**

- *Rejected:* letting Prisma download its Rust query engine; the binary host is unreachable here, so the app uses Prisma 7's driver adapter (`@prisma/adapter-pg`). Documented, with `prisma/sql/init.sql` as the schema fallback.
- *Rejected:* `NODE_ENV=production` set manually on Vercel — it drops `devDependencies` and breaks `prisma generate` during the build. Fixed properly by moving `prisma` and `dotenv` into `dependencies`.
- *Rejected:* a guessed Supabase pooler host. `aws-0` answers but rejects the tenant; a probe proved the project lives on `aws-1`. Guessing would have shipped a broken deploy.
- *Rejected:* trusting "it works locally". Localhost passed 24/24 while production failed 6/8 — the difference was Vercel Deployment Protection intercepting every `*.vercel.app` request with a `302` to `vercel.com/sso-api`. That is now documented as the one setting to check when redeploying.
- *Rewritten:* generated components were tightened to the brief's rules — no state library, no repository abstraction, no `dangerouslySetInnerHTML`, permission logic in exactly one file.

**How correctness was verified.** Type check, lint, production build and the test suite after every phase; a `curl` matrix against the dev server for API behaviour; then the same matrix as an automated smoke test against the live deployment. Nothing in the submission is claimed without a command or a test behind it — the phase-by-phase record is in `ai-log.md`.

---

## Partial or incomplete

| Item | Status |
| --- | --- |
| Walkthrough video | **Pending** — the timestamped script is in `SUBMISSION.md`; the URL goes into `VIDEO_URL.txt` |
| Real-time collaboration | Out of scope by design; `409` conflict handling instead |
| Markdown → underline | CommonMark cannot express underline; `__x__` imports as bold. Underline is editor-only |
| Rate limiting | In-memory, so per Vercel instance |
| Visual QA | No browser binary in the build sandbox: UI verified via jsdom tests, server-rendered HTML and the production build, not screenshot diffing |
| Demo data | Free-tier Supabase pauses after ~a week idle; restore the project in the Supabase dashboard and redeploy |

**With another 2–4 hours I would build:** (1) a demo-data reseed action so reviewers leave no residue, (2) a three-way merge on the `409` path, (3) Markdown export (the serializer is small, and it makes import round-trip in both directions), (4) `.docx` import via `mammoth`, (5) Playwright snapshots of the dashboard, editor and share dialog.

---

## How to review in 3 minutes

1. Open https://docket-suhaibshaik2917.vercel.app → click the **Alice** chip.
2. Create a document, type, apply bold/italic/underline/H2/lists → watch `Saving… → Saved just now` → hard-refresh: everything persists.
3. **Import** a `.md` file → it becomes a formatted document. Try a `.pdf` → clear inline error.
4. **Share** with `bob@demo.test` as Viewer. In a private window, sign in as **Bob**: read-only banner, disabled toolbar, document under *Shared with me*. Optionally fire a `PATCH` from DevTools → `403`.
5. Back as Alice: change Bob to **Editor** → Bob can edit. Revoke → Bob sees "Document not found" (`404`).
6. Sign in as **Dave**: that document does not exist for him.
