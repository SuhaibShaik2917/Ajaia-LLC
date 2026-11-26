# AI workflow

This build was produced with an AI coding agent (Arena.ai Agent Mode) working
inside the assessment repository, with a human supplying the specification
(`AGENT BUILD PROMPT`) and reviewing the result. Everything below happened in
that session; nothing is reconstructed from imagination.

## 1. Tools

| Tool | Role |
| --- | --- |
| Arena.ai Agent Mode (Claude-family agent with shell access) | Scaffolding, implementation, tests, docs |
| Node 22 / npm | Package management, Next.js, Prisma CLI |
| PostgreSQL 19 (local, embedded binaries outside the repo) | Real database for `dev`, seed and the Vitest suite |
| `curl` | Manual API matrix verification against the running dev server |
| Vitest (+ jsdom for component tests) | 44 automated tests |
| `tsc --noEmit`, `next lint`, `next build` | Type, lint and production-build gates after each phase |
| `git` | Phase-sized commits |

No browser binary was available in the sandbox (Chromium could not launch —
missing `libnspr4`), so UI verification used the production build, server-rendered
HTML checks and jsdom component tests; visual QA is left to the reviewer's browser.

## 2. Key prompts

The task started as one long specification. The instructions that most shaped the
implementation were:

1. *"All document permission logic lives only in `src/lib/services/permissions.ts`.
   Routes never re-implement it."* → permission decisions are one function with a
   single return shape; every route calls it, and the tests call it directly.
2. *"Middleware redirects unauthenticated page requests, but every API route
   independently verifies the cookie."* → `requireUser(request)` is the first
   statement of every handler; middleware only handles `/`, `/login`,
   `/documents/*`.
3. *"No access → 404 (don't leak existence); access but insufficient → 403."*
   → encoded once in `getDocumentWithAccess`, and asserted in three test cases
   (stranger 404, viewer 403, editor 403 on share endpoints).
4. *"Autosave: 1s debounce, one in-flight request at a time plus a 'dirty again'
   flag, retry with backoff, flush on beforeunload, `immediatelyRender: false`."*
   → `useAutosave` implements exactly that, with five tests covering debounce
   coalescing, in-flight flushing, 409 conflict, retry/backoff and read-only.
5. *"`.md`: `marked` → HTML → `generateJSON` using the same extension set as the
   editor (this drops unknown tags such as `<script>`)."* → one shared
   `editorExtensions` array, plus a test that imported `<script>` never survives.
6. *"If a phase runs over budget, apply the fallback and move on."* → used twice:
   Prisma engine download (fallback: driver adapter + SQL bootstrap) and browser
   verification (fallback: jsdom component tests).

Follow-up prompts in this session were narrow ("make it typecheck", "add tests
for the matrix", "write the docs from the repo state"). Each was executed as a
separate step with a verification gate.

## 3. Generated output that was changed or rejected

These are real corrections, kept here because they show where the first answer
was wrong.

| What the AI produced first | Why it was rejected | What shipped |
| --- | --- | --- |
| Prisma 5.22 with `url`/`directUrl` in `schema.prisma` | `prisma generate` tried to download the schema engine from `binaries.prisma.sh`, unreachable in this sandbox; Prisma 5 also needs Rust query-engine binaries | **Prisma 7.10.1** with `@prisma/adapter-pg`, URLs moved to `prisma.config.ts` (Prisma 7 rejects them in the schema) |
| Prisma 8 RC as the engine-free option | `prisma@8` removed `generate` entirely (`contract emit`), and `@prisma/client@8.0.0-rc.36` was not published — unusable | Stayed on Prisma 7 |
| `prisma db push` for local setup | Schema-engine binary is a hard dependency of the CLI | `prisma/sql/init.sql` + `npm run db:init` (documented as a fallback, `db push` remains the primary path) |
| `useEditor` remount keyed on `${id}-${version}` | The save response bumps `version`, which remounted the editor and dropped the caret after the first save | Key on the fetched document only (`${id}-v${fetched.version}`) — remounts on reload, not on save |
| Sidebar active state read from `window.location` in an effect | `?view=` changes do not change `pathname`, so the highlight went stale | `useSearchParams()` |
| `parseJsonBody<T>(request, schema: ZodType<T>)` | Zod effects (`transform` on the Tiptap doc) made TypeScript infer the *input* type, so route bodies did not match `TiptapDoc` | Helper accepts `{ parse(input: unknown): T }`; deep Zod validation stays, output is typed |
| Test asserted `__underline__` renders `<u>` | Wrong: CommonMark treats `__x__` as strong emphasis; markdown has no underline syntax | Test inverted to document the real behaviour, and README lists it as a limitation |
| `@sparticuz/chromium` + puppeteer for end-to-end UI checks | Chromium cannot start in this sandbox (`libnspr4.so` missing), and apt is unavailable | jsdom + Testing Library tests for the toolbar and autosave hook; browser QA delegated to the reviewer |
| Vitest config including only `tests/**/*.test.ts` | Silently skipped the two `.tsx` suites (43 tests were reported as 35) | Include glob widened to `{ts,tsx}` — caught by noticing the file count |

## 4. Verification

Each phase ended with the same gates, run in this order:

```bash
npx tsc --noEmit     # types
npm run lint         # eslint
npm test             # 44 tests against real Postgres
npm run build        # prisma generate && next build
```

Manual verification against the running dev server with `curl` (real responses,
recorded in `ai-log.md`):

- login: wrong password → `401 {"code":"UNAUTHORIZED"}`; correct → `200` + cookie
- `GET /api/documents` without a cookie → `401`; `/` while logged out → `307 /login`
- Alice creates → `201`, PATCH → `version 2`, re-GET shows the new content
- Bob (Viewer) GET `200`, PATCH `403 "You only have view access"`
- Bob on Alice's private document → `404` for GET and PATCH
- Dave shared as Viewer → 200/403, promoted to Editor → PATCH `200`, revoked → GET `404`
- Share endpoints as non-owner → `403`; unknown email → `404 USER_NOT_FOUND`;
  self-share → `400 CANNOT_SHARE_WITH_SELF`
- Import: `.md` → heading/bold/lists in the stored JSON; `.txt` → paragraphs with
  hard breaks; `.pdf` → `400 INVALID_FILE_TYPE`; empty → `400 EMPTY_FILE`;
  >1 MB → `413 FILE_TOO_LARGE`; Latin-1 bytes → `400 INVALID_ENCODING`;
  cross-origin `Origin` → `403 INVALID_ORIGIN`
- Stale `baseVersion` → `409 VERSION_CONFLICT`

Automated coverage is listed in `README.md` (Testing). The suite is the primary
regression net: every permission row in `ARCHITECTURE.md` has a test.

## 5. Debugging approach

1. **Reproduce with the smallest surface.** Prisma engine failures were isolated
   in a scratch project (`/tmp/ptest`) before touching the repository.
2. **Read the tool's own diagnostics.** `DEBUG="prisma:fetch-engine*"` revealed the
   version-probe behaviour that made a stub viable for `generate` — instead of
   guessing why a file existed but was still downloaded.
3. **Gate on evidence, not vibes.** A phase was only "done" when `tsc`, `lint`,
   `test` and `build` passed, plus a `curl` matrix for API behaviour.
4. **Prefer one shared source of truth.** Several bugs (toolbar drift, import
   inconsistency) are avoided structurally by sharing `editorExtensions` and
   `getDocumentWithAccess`.
5. **Fix the test, not the product, when the product is right.** The underline
   case was a wrong assumption in a test, not a bug; the fix documented reality.

## 6. Where AI accelerated the work, and where it needed supervision

- Fast: boilerplate routes, Tailwind layout, Zod schemas, the long test matrix,
  documentation — roughly 8–10× the throughput of typing this by hand.
- Needed supervision: anything touching runtime/platform facts (Prisma engine
  downloads, Chromium libraries, Vitest glob matching, editor remount keys).
  Those are exactly the cases recorded in section 3.
- Not delegated: the scope decisions (drop P2, keep P1 to the cheap wins) and the
  final permission matrix review.
