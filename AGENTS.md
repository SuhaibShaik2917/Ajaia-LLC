# AGENTS.md — working agreement for this repo

Read this before changing anything. It is the short version of `ARCHITECTURE.md`
plus the house rules the build followed.

## What this is

**Docket** — a small Google-Docs-style editor: demo-user login, documents with
rich text and autosave, `.txt`/`.md` import, and per-document Viewer/Editor
sharing enforced on the server.

## Stack (do not substitute)

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 App Router, React 18, TypeScript (strict) |
| Styling | Tailwind CSS + `lucide-react`, `sonner` for toasts |
| Editor | Tiptap v2 (`@tiptap/react`, `@tiptap/pm`, `starter-kit`, `extension-underline`, `@tiptap/html`) |
| Data | Prisma 7 + PostgreSQL (Supabase in production, any Postgres locally) |
| Auth | `bcryptjs` + `jose` HS256 JWT in an httpOnly, Secure, SameSite=Lax cookie |
| Validation | `zod`, types inferred with `z.infer` |
| Markdown | `marked` (HTML → Tiptap JSON via `generateJSON`) |
| Tests | Vitest against a real Postgres (`TEST_DATABASE_URL`) |

## File map

```
prisma/schema.prisma          frozen data model
prisma/seed.ts                idempotent demo data
prisma/sql/init.sql           bootstrap DDL (offline fallback for `prisma db push`)
prisma.config.ts              Prisma 7 config: schema path, seed command, CLI URL
src/middleware.ts             page redirects only — never the security boundary
src/app/(app)/                authenticated shell: dashboard + editor route
src/app/login/page.tsx        login screen with demo-account chips
src/app/api/**/route.ts       REST handlers (thin: auth → parse → service → JSON)
src/lib/auth.ts               session cookie + requireUser() for API routes
src/lib/session.ts            edge-safe JWT sign/verify (used by middleware)
src/lib/errors.ts             AppError + central handleError()
src/lib/validation.ts         every Zod schema and size limit
src/lib/http.ts               parseJsonBody(), assertSameOrigin()
src/lib/services/permissions.ts   the ONLY place document permissions live
src/lib/services/documents.ts     document reads/writes
src/lib/services/shares.ts        collaborator management
src/lib/import/convert.ts     pure (filename, bytes) → Tiptap JSON
src/lib/editor/extensions.ts  ONE extension list for editor + importer
src/lib/hooks/useAutosave.ts  debounce, single in-flight, retry, 409 handling
src/lib/api-client.ts         typed fetch wrapper for client components
src/types/index.ts            shared DTO types
```

## Rules

1. Permission logic lives only in `src/lib/services/permissions.ts`. Routes call
   `getDocumentWithAccess(id, userId, "view" | "edit" | "owner")`.
2. Every API route calls `requireUser(request)` itself. Middleware only helps
   browsers; it is never the only gate.
3. No access → **404** (never 404-vs-403 leaks). Insufficient role → **403**.
4. Validate with Zod schemas from `src/lib/validation.ts`; infer types from them.
5. Error responses are always `{ error: { code, message, fields? } }` via
   `handleError`. No stack traces, no raw Prisma errors.
6. No raw SQL in app code (the only SQL is `prisma/sql/init.sql`, a bootstrap
   fallback), no `dangerouslySetInnerHTML`, no secrets in client code, no
   `NEXT_PUBLIC_` for secrets.
7. Content is a ProseMirror document (`{type:"doc", content:[...]}`) ≤ 2 MB;
   titles are trimmed and 1–200 chars.
8. Concurrent edits: last-write-wins with a `version` counter; a stale
   `baseVersion` returns **409 `VERSION_CONFLICT`**.
9. Import is server-side, in memory, never written to disk; `.txt`/`.md` only,
   ≤ 1 MB, UTF-8, no null bytes.
10. Keep the editor and the importer on the same extension set
    (`src/lib/editor/extensions.ts`).
11. No new dependencies without a reason recorded in `ai-log.md`.

## Scripts

```
npm run dev        # local dev server
npm run build      # prisma generate && next build
npm test           # vitest, needs TEST_DATABASE_URL
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run db:push    # prisma db push (schema → database)
npm run db:seed    # prisma db seed (idempotent)
npm run db:init    # SQL fallback when the Prisma schema engine is unavailable
```

## API contract

Login/logout/me, `/api/users`, `/api/documents` (GET/POST), `/api/documents/:id`
(GET/PATCH/DELETE), `/api/documents/import`, `/api/documents/:id/shares`
(GET/POST), `/api/documents/:id/shares/:userId` (PATCH/DELETE). Full table with
status codes in `ARCHITECTURE.md` and `README.md`.

## Before you commit

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```
