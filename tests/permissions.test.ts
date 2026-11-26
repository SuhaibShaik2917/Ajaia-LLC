import { beforeEach, describe, expect, it } from "vitest";
import {
  DELETE as deleteDocumentRoute,
  GET as getDocumentRoute,
  PATCH as patchDocumentRoute,
} from "@/app/api/documents/[id]/route";
import {
  GET as listSharesRoute,
  POST as createShareRoute,
} from "@/app/api/documents/[id]/shares/route";
import {
  DELETE as revokeShareRoute,
  PATCH as updateShareRoleRoute,
} from "@/app/api/documents/[id]/shares/[userId]/route";
import { prisma } from "@/lib/db";
import { getDocumentWithAccess } from "@/lib/services/permissions";
import {
  EMPTY_DOC,
  authedRequest,
  createUser,
  jsonBody,
  params,
  resetDatabase,
} from "./helpers";

describe("document permissions and sharing", () => {
  let owner: { id: string; email: string };
  let viewer: { id: string; email: string };
  let editor: { id: string; email: string };
  let stranger: { id: string; email: string };
  let documentId: string;

  beforeEach(async () => {
    await resetDatabase();
    owner = await createUser({ email: "alice@demo.test", name: "Alice" });
    viewer = await createUser({ email: "bob@demo.test", name: "Bob" });
    editor = await createUser({ email: "carol@demo.test", name: "Carol" });
    stranger = await createUser({ email: "dave@demo.test", name: "Dave" });

    const document = await prisma.document.create({
      data: { ownerId: owner.id, title: "Shared doc", content: EMPTY_DOC },
    });
    documentId = document.id;

    await prisma.documentShare.create({
      data: { documentId, userId: viewer.id, role: "VIEWER" },
    });
    await prisma.documentShare.create({
      data: { documentId, userId: editor.id, role: "EDITOR" },
    });
  });

  it("resolves roles as OWNER > EDITOR > VIEWER", async () => {
    await expect(getDocumentWithAccess(documentId, owner.id, "owner")).resolves.toMatchObject({
      myRole: "OWNER",
    });
    await expect(getDocumentWithAccess(documentId, editor.id, "edit")).resolves.toMatchObject({
      myRole: "EDITOR",
    });
    await expect(getDocumentWithAccess(documentId, viewer.id, "view")).resolves.toMatchObject({
      myRole: "VIEWER",
    });
    await expect(getDocumentWithAccess(documentId, viewer.id, "edit")).rejects.toMatchObject({
      status: 403,
    });
    await expect(getDocumentWithAccess(documentId, stranger.id, "view")).rejects.toMatchObject({
      status: 404,
    });
    await expect(getDocumentWithAccess("does-not-exist", owner.id, "view")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lets the viewer read but not write", async () => {
    const read = await getDocumentRoute(
      await authedRequest(viewer.id, `/api/documents/${documentId}`),
      params({ id: documentId })
    );
    expect(read.status).toBe(200);
    expect((await read.json()).myRole).toBe("VIEWER");

    const before = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

    const write = await patchDocumentRoute(
      await authedRequest(viewer.id, `/api/documents/${documentId}`, {
        method: "PATCH",
        body: jsonBody({ title: "Hacked", content: { type: "doc", content: [] } }),
      }),
      params({ id: documentId })
    );
    expect(write.status).toBe(403);

    const after = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    expect(after.title).toBe(before.title);
    expect(after.content).toEqual(before.content);
    expect(after.version).toBe(before.version);
  });

  it("lets an editor write after a role change and blocks it again after revoke", async () => {
    const promote = await updateShareRoleRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares/${viewer.id}`, {
        method: "PATCH",
        body: jsonBody({ role: "EDITOR" }),
      }),
      params({ id: documentId, userId: viewer.id })
    );
    expect(promote.status).toBe(200);
    expect((await promote.json()).share.role).toBe("EDITOR");

    const write = await patchDocumentRoute(
      await authedRequest(viewer.id, `/api/documents/${documentId}`, {
        method: "PATCH",
        body: jsonBody({ title: "Bob can edit now" }),
      }),
      params({ id: documentId })
    );
    expect(write.status).toBe(200);

    const revoke = await revokeShareRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares/${viewer.id}`, {
        method: "DELETE",
      }),
      params({ id: documentId, userId: viewer.id })
    );
    expect(revoke.status).toBe(204);

    const afterRevoke = await getDocumentRoute(
      await authedRequest(viewer.id, `/api/documents/${documentId}`),
      params({ id: documentId })
    );
    expect(afterRevoke.status).toBe(404);
  });

  it("returns 404 for strangers on every document endpoint", async () => {
    const [get, patch, remove] = await Promise.all([
      getDocumentRoute(
        await authedRequest(stranger.id, `/api/documents/${documentId}`),
        params({ id: documentId })
      ),
      patchDocumentRoute(
        await authedRequest(stranger.id, `/api/documents/${documentId}`, {
          method: "PATCH",
          body: jsonBody({ title: "nope" }),
        }),
        params({ id: documentId })
      ),
      deleteDocumentRoute(
        await authedRequest(stranger.id, `/api/documents/${documentId}`, { method: "DELETE" }),
        params({ id: documentId })
      ),
    ]);

    expect([get.status, patch.status, remove.status]).toEqual([404, 404, 404]);
    expect(await prisma.document.count()).toBe(1);
  });

  it("only lets the owner manage shares", async () => {
    const listAsViewer = await listSharesRoute(
      await authedRequest(viewer.id, `/api/documents/${documentId}/shares`),
      params({ id: documentId })
    );
    expect(listAsViewer.status).toBe(403);

    const listAsEditor = await listSharesRoute(
      await authedRequest(editor.id, `/api/documents/${documentId}/shares`),
      params({ id: documentId })
    );
    expect(listAsEditor.status).toBe(403);

    const addAsEditor = await createShareRoute(
      await authedRequest(editor.id, `/api/documents/${documentId}/shares`, {
        method: "POST",
        body: jsonBody({ email: "dave@demo.test", role: "VIEWER" }),
      }),
      params({ id: documentId })
    );
    expect(addAsEditor.status).toBe(403);

    const revokeAsEditor = await revokeShareRoute(
      await authedRequest(editor.id, `/api/documents/${documentId}/shares/${viewer.id}`, {
        method: "DELETE",
      }),
      params({ id: documentId, userId: viewer.id })
    );
    expect(revokeAsEditor.status).toBe(403);

    const listAsOwner = await listSharesRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares`),
      params({ id: documentId })
    );
    expect(listAsOwner.status).toBe(200);
    const shares = (await listAsOwner.json()).shares;
    expect(shares).toHaveLength(2);
    expect(shares.map((share: { role: string }) => share.role).sort()).toEqual([
      "EDITOR",
      "VIEWER",
    ]);
  });

  it("shares by email, upserts roles and reports clean errors", async () => {
    const created = await createShareRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares`, {
        method: "POST",
        body: jsonBody({ email: "  DAVE@demo.test ", role: "VIEWER" }),
      }),
      params({ id: documentId })
    );
    expect(created.status).toBe(200);
    const createdBody = await created.json();
    expect(createdBody.share).toMatchObject({ userId: stranger.id, role: "VIEWER" });

    // Upsert: same email twice updates instead of duplicating.
    const again = await createShareRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares`, {
        method: "POST",
        body: jsonBody({ email: "dave@demo.test", role: "EDITOR" }),
      }),
      params({ id: documentId })
    );
    expect(again.status).toBe(200);
    expect((await again.json()).share.role).toBe("EDITOR");
    expect(await prisma.documentShare.count({ where: { userId: stranger.id } })).toBe(1);

    const unknown = await createShareRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares`, {
        method: "POST",
        body: jsonBody({ email: "nobody@demo.test", role: "VIEWER" }),
      }),
      params({ id: documentId })
    );
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error.code).toBe("USER_NOT_FOUND");

    const self = await createShareRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares`, {
        method: "POST",
        body: jsonBody({ email: "alice@demo.test", role: "VIEWER" }),
      }),
      params({ id: documentId })
    );
    expect(self.status).toBe(400);
    expect((await self.json()).error.code).toBe("CANNOT_SHARE_WITH_SELF");

    const badRole = await createShareRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares`, {
        method: "POST",
        body: jsonBody({ email: "dave@demo.test", role: "ADMIN" }),
      }),
      params({ id: documentId })
    );
    expect(badRole.status).toBe(400);
  });

  it("returns 404 when changing a role for someone without a share", async () => {
    const response = await updateShareRoleRoute(
      await authedRequest(owner.id, `/api/documents/${documentId}/shares/${stranger.id}`, {
        method: "PATCH",
        body: jsonBody({ role: "EDITOR" }),
      }),
      params({ id: documentId, userId: stranger.id })
    );
    expect(response.status).toBe(404);
  });
});
