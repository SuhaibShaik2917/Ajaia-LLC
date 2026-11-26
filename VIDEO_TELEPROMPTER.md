# Recording cue card — Docket walkthrough (target 4:30–4:50)

One page to keep on a second monitor while you record. **Bold** = what you click/type.
Say it in your own words if mine feel stiff — but keep the order, it's the order a
reviewer scores.

---

## Before you hit record

- [ ] Two windows side by side: **A** = Chrome normal, **B** = Chrome incognito.
- [ ] Window A already signed in as **Alice** (dashboard visible).
- [ ] `demo-notes.md` on the desktop (content at the bottom of this file).
- [ ] A `.pdf` of anything, to show the rejection.
- [ ] Close Slack/notifications; zoom the browser to ~110% so text reads at 1080p.
- [ ] Loom: "Screen + cam" (cam optional, but a face reads better for a hiring video). 1080p, no timer.
- [ ] Know your live URL: **https://docket-suhaibshaik2917.vercel.app**

---

## Script

### 0:00 — What it is (15s)
> "This is Docket, my submission for the AI-Native Full Stack assignment. It's a small
> collaborative document editor: create, format, autosave, import and share documents,
> with roles the server enforces — not just buttons it hides. Next.js and Postgres,
> running live on Vercel and Supabase."

### 0:15 — Login + dashboard (25s) — **click the Alice chip**
> "Four seeded users, one demo password. Alice owns four documents. The dashboard splits
> owned from shared, and every row carries created and updated timestamps."

### 0:40 — Create, rename, format (45s) — **New document → click title → type → then toolbar: Bold, Italic, Underline, H2, bullet list, numbered list**
> "New document, rename it inline. Formatting is Tiptap: bold, italic, underline,
> headings, both list types — and the toolbar reflects the cursor's active marks."

### 1:25 — Autosave + refresh (30s) — **pause, point at "Saved just now", then hard-refresh (Cmd/Ctrl+Shift+R)**
> "Autosave is a one-second debounce with a single request in flight, and the version is
> checked on every write, so a second tab turns into a recoverable conflict instead of
> silently overwriting. Hard refresh — title, formatting and timestamps all come back."

### 1:55 — Import (35s) — **Import file → choose demo-notes.md → open it → then Import again → choose the .pdf**
> "Markdown import runs server-side through the same Tiptap schema the editor uses, so
> what comes out is always editable. Unsupported types fail with a specific message, and
> the dialog states what's accepted: .txt and .md, up to a megabyte."

### 2:30 — Share (25s) — **Share → bob@demo.test → Viewer → Save**
> "Sharing is by email, with two roles. Only the owner can manage the collaborator list."

### 2:55 — Bob sees it read-only (30s) — **switch to window B → Bob chip → open the doc from "Shared with me"**
> "Bob's view: the same document, read-only, toolbar disabled. It's listed under shared,
> not owned."

### 3:25 — The beat that matters (40s) — *optional:* **window B: DevTools → Network → re-send the PATCH request → show 403**
> "The disabled toolbar is a courtesy. If Bob fires the write anyway, the server returns
> four-oh-three and the database is untouched. And Dave, who was never shared, gets a
> not-found — so the app never confirms a document exists to someone who can't see it."

### 4:05 — Role change + revoke (20s) — **window A: Share → change Bob to Editor → Save → window B reloads and can edit → window A revoke → window B reloads → "Document not found"**
> "Role change and revoke take effect on the very next request — no stale session."

### 4:25 — Why it's shaped this way (30s) — **open the README or ARCHITECTURE on screen**
> "What I deliberately didn't build: real-time collaboration was out of scope, so
> concurrent edits resolve through a version conflict rather than operational transforms.
> No DOCX, no comments, no version history — the time went into tests and permissions
> instead. One file decides every role, every route re-verifies the session itself, and
> there are forty-four automated tests plus an acceptance script that drove this exact
> deployment: twenty-four checks, all green."

### 4:55 — Close (10s)
> "Local setup is five commands in the README. Thanks for watching."

---

## If you want a terminal beat instead of DevTools (30s, looks technical, easy)

Copy the document id from Alice's URL — `/documents/<DOC_ID>` — then in a terminal:

```bash
BASE=https://docket-suhaibshaik2917.vercel.app
DOC=<DOC_ID>

# Bob is a Viewer on Alice's document
curl -s -c /tmp/bob.txt -X POST $BASE/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"bob@demo.test","password":"Demo@1234"}' -o /dev/null

curl -s -b /tmp/bob.txt -X PATCH $BASE/api/documents/$DOC \
  -H 'content-type: application/json' -d '{"title":"hacked"}' \
  -o /dev/null -w 'viewer PATCH  -> %{http_code}\n'      # expect 403

# Dave has no share at all
curl -s -c /tmp/dave.txt -X POST $BASE/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"dave@demo.test","password":"Demo@1234"}' -o /dev/null

curl -s -b /tmp/dave.txt $BASE/api/documents/$DOC \
  -o /dev/null -w 'unshared GET  -> %{http_code}\n'      # expect 404

curl -s $BASE/api/documents/$DOC -o /dev/null -w 'no session    -> %{http_code}\n'   # expect 401
```

Expected output, in order: `403`, `404`, `401`.

---

## After recording

- Loom/YouTube → visibility **Unlisted** (not private — a private link can't be opened by the reviewer).
- Copy the link and either paste it in chat (I'll commit it into `VIDEO_URL.txt`) or edit the file on GitHub.
- Check the video plays in a logged-out window before you submit.

## demo-notes.md

```markdown
# Launch retro

Three things went well:
- Docs shipped on time
- Support load stayed flat

Next quarter we should **automate the release notes** and _measure adoption_ weekly.
```
