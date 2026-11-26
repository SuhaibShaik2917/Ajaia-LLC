# Submission — Docket

| | |
| --- | --- |
| **Repository** | https://github.com/SuhaibShaik2917/Ajaia-LLC (branch `arena/b8fb2d87-ajaia-llc`) |
| **Live URL** | **Not deployed.** This build environment had no Vercel/Supabase credentials and outbound network was limited to GitHub and npm, so a hosted deployment could not be created here. The repo is deployment-ready; see [README → Deployment](./README.md#deployment-vercel--supabase). |
| **Local run** | `npm install && cp .env.example .env && npx prisma db push && npm run db:seed && npm run dev` |
| **Video** | `VIDEO_URL.txt` → `PASTE_URL_HERE` (recorded by the candidate after this build) |
| **Docs** | [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [AI_WORKFLOW](./AI_WORKFLOW.md) · [AGENTS](./AGENTS.md) · [ai-log](./ai-log.md) |
| **Tests** | `npm test` → 7 files, 44 tests, all passing against a real Postgres |

## Demo credentials

Password for every account: `Demo@1234`

| Email | Role in the seeded data |
| --- | --- |
| `alice@demo.test` | Owner of 4 documents (one richly formatted, one blank) |
| `bob@demo.test` | Owns 1 document, **Viewer** on Alice's "Product launch checklist" |
| `carol@demo.test` | **Editor** on Alice's "Q3 hiring plan" |
| `dave@demo.test` | No shares — use to demonstrate 404 for unshared documents |

## Status matrix

### P0 — complete

| Requirement | Status | Evidence |
| --- | --- | --- |
| 4 demo users log in/out, session survives refresh | ✅ | `POST /api/auth/login` + httpOnly cookie (7 days); middleware redirect; manual curl |
| Create / rename / edit / reopen; persists after refresh | ✅ | `POST`/`PATCH`/`GET /api/documents/:id`; `tests/documents.test.ts` |
| Created + updated timestamps | ✅ | Shown per row and in the editor footer; ISO strings from the API |
| Dashboard sections *My documents* / *Shared with me* | ✅ | `?view=` tabs + sidebar links; `tests/documents.test.ts` (listings) |
| Bold, italic, underline, H1–H3, bullets, numbered lists persist | ✅ | Toolbar + `tests/content.test.ts` deep-equal round-trip, `tests/format.test.ts` |
| Save status visible and accurate (incl. failure) | ✅ | `SaveStatus` + `tests/autosave.test.tsx` (saving / saved / error+retry / conflict / read-only) |
| `.txt`/`.md` import; invalid/oversize/empty errors; types shown | ✅ | `tests/import.test.ts`; dialog text "Supported: .txt, .md (max 1 MB)" |
| Share (Viewer/Editor), change role, revoke | ✅ | `tests/permissions.test.ts`, `ShareDialog` |
| Viewer UI read-only **and** server 403 on Viewer PATCH | ✅ | Disabled toolbar + banner; `viewer PATCH → 403`, DB unchanged (test) |
| Unshared user → 404; unauthenticated → 401 | ✅ | `tests/permissions.test.ts`, `tests/documents.test.ts` |
| `npm test` green, `tsc --noEmit` clean, `next build` succeeds | ✅ | 44/44 tests, 0 type errors, 0 lint warnings, successful production build |
| Deployed (Vercel + Supabase) with smoke test | ❌ **not done** | No cloud credentials/egress in this environment; steps documented in README, and `node scripts/smoke-prod.mjs <url>` runs the full acceptance flow (24 checks, passing against localhost) |
| README, ARCHITECTURE, AI_WORKFLOW, SUBMISSION, VIDEO_URL.txt | ✅ | This repository (video URL is a placeholder by design) |
| No secrets committed; `.env.example` present | ✅ | `.env` is git-ignored and never committed; `.env.example` documents every variable |

### P1 — complete

| Item | Status |
| --- | --- |
| Delete document (owner only, confirm dialog) | ✅ |
| Version-conflict 409 + reload banner | ✅ (plus a stale-version test) |
| Toasts | ✅ (`sonner`) |
| Mobile drawer navigation | ✅ (sidebar becomes a drawer under `lg`) |
| Dashboard search | ✅ (client-side title filter with empty-result hint) |
| Login rate limiting | ✅ (in-memory, 8 failures / 15 min, `429 TOO_MANY_ATTEMPTS`) |

### P2 — deliberately not built

DOCX import, export, comments, version history, real-time collaboration. Each was
out of scope in the brief; the remaining time went into tests and documentation.

## Known issues / limitations

1. **Not deployed.** The only unmet acceptance item. Everything needed is in the
   repo; the deployment and production smoke-test steps are in `README.md`.
2. **No real-time collaboration.** Concurrent edits are last-write-wins; a stale
   `baseVersion` returns 409 and *Reload latest* discards unsaved local edits.
3. **Markdown cannot express underline.** `__x__` imports as bold (CommonMark);
   underline is editor-only.
4. **In-memory login rate limiting** is per process, so it is per Vercel instance.
5. **jsdom-only component tests.** No browser binary was available, so toolbar and
   autosave are covered by jsdom tests and the layout was verified by CSS review
   and the production build, not by screenshot diffing.
6. **Prisma 7 specifics.** The schema engine binary cannot be downloaded offline
   here; `prisma/sql/init.sql` + `npm run db:init` is the documented fallback and
   `scripts/sandbox-shim-prisma.sh` exists only to let `prisma generate` run in
   this sandbox. On a networked machine use `npx prisma db push`.
7. Imported markdown is normalised by the Tiptap schema (unknown HTML dropped by
   design), so whitespace and exotic syntax may change on import.

## Video script (≈4–5 minutes)

| Time | Beat |
| --- | --- |
| 0:00 | Intro: what Docket is, the stack, and that the P0 scope is complete. |
| 0:15 | Login with the **Alice** chip → dashboard with *My documents* (4) and *Shared with me*. Point out timestamps. |
| 0:45 | **New document** → rename the title → type a paragraph, then show bold, italic, underline, H1/H2/H3, bullet list, numbered list using the toolbar (active states visible). |
| 1:30 | Show `Saving…` → `Saved just now`, then hard-refresh: every format persists, title and timestamps intact. |
| 2:00 | **Import file** → a `.md` file with `#`, `**bold**`, `-`, `1.` becomes a formatted document. Then try a `.pdf` (clear inline error) and note the "Supported: .txt, .md (max 1 MB)" hint. |
| 2:30 | **Share** → `bob@demo.test` as **Viewer**. Show the role badge and collaborator list. |
| 2:50 | Bob in a private window: *Shared with me* lists the document, read-only banner, disabled toolbar and title. Optionally show the blocked PATCH `403` in DevTools → Network. |
| 3:20 | Alice changes Bob to **Editor**; Bob edits and saves; Alice revokes; Bob's document turns into "Document not found" (404 by design). |
| 3:50 | Architecture: one permission service, every API route verifies the session, autosave debounce + single in-flight request + 409 handling, server-side import with the editor's extension set. |
| 4:15 | AI workflow: what the agent accelerated, and one rejected suggestion (Prisma 5 native engines → Prisma 7 driver adapter, because the engine binaries could not be downloaded here). Close with limitations (no realtime, deployment pending). |

## Final acceptance checklist

- [x] 4 demo users can log in/out; session survives refresh
- [x] Create / rename / edit / reopen; content persists after refresh
- [x] Created + updated timestamps visible; Owned and Shared sections
- [x] Bold, italic, underline, H1–H3, bullets, numbered lists work and persist
- [x] Save status visible and accurate (incl. failure state)
- [x] `.txt`/`.md` import works; invalid/oversize/empty → clear errors; types shown
- [x] Share (Viewer/Editor), change role, revoke
- [x] Viewer UI read-only AND server returns 403 on Viewer PATCH
- [x] Unshared user → 404; unauthenticated → 401
- [x] `npm test` green, `tsc --noEmit` clean, `next build` succeeds
- [ ] Deployed (Vercel + Supabase), data survives redeploy, smoke test passes
      — **blocked: no cloud credentials in this environment**
- [x] README, ARCHITECTURE, AI_WORKFLOW, SUBMISSION, VIDEO_URL.txt complete and accurate
- [x] No secrets committed; `.env.example` present
