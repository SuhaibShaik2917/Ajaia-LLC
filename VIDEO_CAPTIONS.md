# Silent-video captions — Docket walkthrough

Use this if you record **without a microphone**. Paste each block into Loom's caption
field (or a title card / annotation) timed to the segment. The brief asks the video to
cover five things; the ✓ column shows which caption covers which.

Rules that make silent videos read well: one idea per caption, ≤ 12 words, hold each for
4–6 seconds, and never let a caption describe something that isn't on screen yet.

| # | Time | Caption | Covers |
| --- | --- | --- | --- |
| 1 | 0:00 | Docket — a small collaborative document editor. Next.js + Postgres, live on Vercel. | what it is |
| 2 | 0:08 | Four seeded users. *My documents* vs *Shared with me*, with timestamps. | main flow |
| 3 | 0:18 | ✓ create a document | main flow |
| 4 | 0:26 | Rich text: bold, italic, underline, headings, both list types. | functionality |
| 5 | 0:36 | Autosave: 1 s debounce, one request in flight, version checked per write. | implementation |
| 6 | 0:44 | Hard refresh — title, formatting and timestamps all persist. | functionality |
| 7 | 0:54 | Import `.md`/`.txt` server-side, through the editor's own schema. | functionality |
| 8 | 1:04 | Unsupported types fail loudly: `.pdf` → 400, with the accepted types stated in the UI. | functionality |
| 9 | 1:14 | Share by email as Viewer or Editor. Only the owner manages the list. | functionality |
| 10 | 1:24 | Bob's view: same document, read-only, toolbar disabled. | main flow |
| 11 | 1:36 | But the toolbar is only a courtesy — a Viewer's `PATCH` returns **403**. | implementation |
| 12 | 1:48 | An unshared user gets **404**, so document existence never leaks. | implementation |
| 13 | 1:58 | Promote to Editor → writes succeed. Revoke → the document disappears. | main flow |
| 14 | 2:10 | Every role decision lives in one file: `permissions.ts`. Routes never re-implement it. | implementation |
| 15 | 2:20 | Every API route re-verifies the session; middleware is only a redirect for humans. | implementation |
| 16 | 2:32 | Deliberately not built: real-time collaboration, DOCX, comments, version history. | deprioritised |
| 17 | 2:44 | Concurrent edits resolve through a `409` version conflict, not operational transforms. | deprioritised |
| 18 | 2:56 | 44 automated tests, plus an acceptance script that drove this deployment: 24/24 checks. | quality |
| 19 | 3:08 | AI wrote boilerplate and tests fast. I rejected its pooler-host guess and its engine download. | AI workflow |
| 20 | 3:20 | Trust came from running the acceptance script inside a Vercel build — not from "works locally". | AI workflow |
| 21 | 3:32 | Local setup: five commands in the README. Live URL and demo password in SUBMISSION.md. | closing |

Total spoken-free runtime: ~3:45. Trim captions 2, 9 and 17 if you need to land under 3:30.

**If you use captions, also say so in the portal submission** — one line such as
"Walkthrough is captioned rather than narrated" — so the reviewer knows it's a choice and
not a broken audio track.
