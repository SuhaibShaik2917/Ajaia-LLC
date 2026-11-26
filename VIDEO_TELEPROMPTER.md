# Docket — walkthrough video script (final)

One take, screen + voice, no camera needed. **~4:50 runtime, ~730 spoken words**
(fast readers finish nearer 4:30 — that's fine; do not rush to fill time).

Silent variant: see `VIDEO_CAPTIONS.md`. Everything below assumes you are speaking.

**Live URL:** https://docket-suhaibshaik2917.vercel.app · **Password:** `Demo@1234`

---

## Pre-roll (not recorded)

- [ ] Window **A**: Chrome, signed in as **Alice**, dashboard visible.
- [ ] Window **B**: Chrome incognito, login page visible.
- [ ] Desktop: `demo-notes.md` (content at the bottom of this file) and any `.pdf`.
- [ ] Close Slack/notifications. Zoom to ~110%. Loom: screen only, 1080p.
- [ ] Do one dry run of scenes 3 and 7 — they're the only ones with clicks in a hurry.

---

## Flow at a glance

| Time | Scene | On screen | What it proves (brief section) |
| --- | --- | --- | --- |
| 0:00 | Hook | login page | what the product is |
| 0:20 | Login + dashboard | dashboard, two sections | main user flow |
| 0:50 | Create + format | editor, toolbar in use | editing experience |
| 1:40 | Autosave + refresh | save indicator → hard refresh | persistence |
| 2:10 | Import | `.md` opens, `.pdf` rejected | file upload |
| 2:45 | Share | share dialog, Viewer role | sharing |
| 3:05 | Read-only + 403 | Bob's window, DevTools | server-side enforcement |
| 3:35 | Promote / revoke | role change, then 404 | access logic |
| 3:55 | Decisions + cuts | README on screen | implementation decisions, prioritisation |
| 4:35 | AI workflow + close | any doc | AI workflow note |

---

## Scene 1 — Hook (0:00–0:20)

*Screen: login page. Don't touch anything yet.*

> "This is Docket. It's a small collaborative document editor: create a document, format
> it, and it autosaves. Import a markdown file, share it with someone, and give them
> viewer or editor rights — rights the server actually enforces. It's Next.js and
> Postgres, running live on Vercel and Supabase."

---

## Scene 2 — Login + dashboard (0:20–0:50)

*Click the **Alice** chip.*

> "Four seeded users, one demo password, and the login page has a chip for each so you
> don't have to type. I'm Alice. I own four documents. The dashboard splits what I own
> from what's been shared with me, and every row shows when the document was created and
> last updated — which matters, because a collaborative tool is mostly about trust in
> your data."

*Hover a timestamp, then stop moving the mouse.*

---

## Scene 3 — Create + format (0:50–1:40)

*Click **New document**. Click the title, rename it to `Launch notes`. Click into the body
and type exactly:*

```
Pilot ships next week.
```

*Then, with the text selected, use the toolbar in this order: **Bold**, **Italic**,
**Underline**, **H2** on a new line, **Bullet list**, **Numbered list**. Move the cursor in
and out of the bold word so the toolbar highlight changes.*

> "New document. The title renames inline — no modal, no save button. Then the editor
> itself: bold, italic, underline, H1 through H3, bulleted and numbered lists. Tiptap,
> with one shared extension set, so the toolbar reflects the marks at the cursor. Watch
> the toolbar light up as I move into bold text — the UI is reading the document's real
> state, not a separate flag."

---

## Scene 4 — Autosave + refresh (1:40–2:10)

*Pause, let the indicator settle on **Saved just now**, point at it, then hard refresh
(Cmd/Ctrl+Shift+R).*

> "Autosave is a one-second debounce with a single request in flight. Every write carries
> the version I loaded, and the server rejects it if that version has moved on — which is
> how two tabs become a conflict you can see, instead of one silently overwriting the
> other. Hard refresh. Title, formatting, timestamps: all still there."

---

## Scene 5 — Import (2:10–2:45)

*Click **Import file** → choose `demo-notes.md` → open the new document. Then **Import
file** again → choose the `.pdf`.*

> "Import. Markdown or text, up to a megabyte, converted server-side through the same
> schema the editor uses — so imported content can never produce something the editor
> can't open. The dialog states exactly what's accepted. And when it's wrong, it says why:
> a PDF gets a specific rejection, not a generic failure."

---

## Scene 6 — Share (2:45–3:05)

*Back in the Launch notes document: **Share** → `bob@demo.test` → **Viewer** → Save.*

> "Sharing is by email, with two roles. Bob gets viewer. Only the owner can manage this
> list — an editor can write content, but can't re-share the document behind my back."

---

## Scene 7 — Read-only, then the 403 (3:05–3:35)

*Switch to window **B** → click **Bob** → open the document from **Shared with me**.
Scroll it a little so the read-only banner is visible. Then open DevTools → Network
(F12 before recording if you prefer), and re-send the PATCH from Bob's session.*

> "Bob's view: the same document, listed under shared, read-only, toolbar disabled. But
> the disabled toolbar is a courtesy, not the security boundary. If Bob fires the write
> anyway — four-oh-three, and the database is untouched. And Dave, who was never shared,
> gets not-found rather than forbidden, so the app never confirms a document exists to
> someone who isn't allowed to see it."

*Terminal alternative — see the appendix at the bottom; three commands print 403 / 404 /
401 in about fifteen seconds, which is easier to film than DevTools.*

---

## Scene 8 — Promote, then revoke (3:35–3:55)

*Window **A**: **Share** → change Bob to **Editor** → Save. Window **B**: reload, type one
character, see it save. Window **A**: revoke Bob. Window **B**: reload → "Document not
found".*

> "Back as Alice. Promote Bob to editor and his next write succeeds. Revoke him, and the
> document is gone on his very next request. No stale session, no cached permission."

---

## Scene 9 — Decisions and deliberate cuts (3:55–4:35)

*Screen: README or ARCHITECTURE, scrolled to the trade-offs table.*

> "Three decisions shaped this. One: every role decision lives in a single permissions
> service. Routes never re-implement it, and every route re-verifies the session instead
> of trusting middleware. Two: the cuts are deliberate — no real-time collaboration, which
> was out of scope, so concurrent edits resolve through a version conflict rather than
> operational transforms; no DOCX, no comments, no version history. Three: the time went
> into tests — forty-four of them, including the whole permission matrix, plus an
> acceptance script that drove this exact deployment: twenty-four checks, all green."

---

## Scene 10 — AI workflow and close (4:35–4:55)

> "On AI: the agent wrote boilerplate, schemas and the test matrix quickly, and I rejected
> two of its suggestions — a guessed database pooler host, and a build-time engine
> download that can't work in this environment. What earned trust was running the
> acceptance script inside a Vercel build, not 'it works locally'. Local setup is five
> commands in the README. Thanks for watching."

---

## Delivery notes

- **Pause** half a second after each claim; don't narrate every click ("now I click…").
- If you flub a line, **keep going** — a small stumble reads as authentic; a jump-cut reads as rehearsed-but-hiding-something.
- Speak at ~150 words/minute. If you finish before 4:20 you went too fast; slow down rather than adding content.
- Don't read the brief's wording back ("the main user flow is…"). Show it instead; the review form asks them to check it off anyway.

## demo-notes.md

```markdown
# Launch retro

Three things went well:
- Docs shipped on time
- Support load stayed flat

Next quarter we should **automate the release notes** and _measure adoption_ weekly.
```

---

## Appendix — terminal version of Scene 7

Grab the document id from Alice's address bar (`/documents/<DOC_ID>`), then:

```bash
BASE=https://docket-suhaibshaik2917.vercel.app
DOC=<DOC_ID>

# Bob is a Viewer on Alice's document
curl -s -c /tmp/bob.txt -X POST $BASE/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"bob@demo.test","password":"Demo@1234"}' -o /dev/null
curl -s -b /tmp/bob.txt -X PATCH $BASE/api/documents/$DOC \
  -H 'content-type: application/json' -d '{"title":"hacked"}' \
  -o /dev/null -w 'viewer PATCH  -> %{http_code}\n'      # 403

# Dave has no share at all
curl -s -c /tmp/dave.txt -X POST $BASE/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"dave@demo.test","password":"Demo@1234"}' -o /dev/null
curl -s -b /tmp/dave.txt $BASE/api/documents/$DOC \
  -o /dev/null -w 'unshared GET  -> %{http_code}\n'      # 404

curl -s $BASE/api/documents/$DOC -o /dev/null -w 'no session    -> %{http_code}\n'   # 401
```

Then say: *"Three different sessions, three different answers, all decided on the server."*
