import { beforeEach, describe, expect, it } from "vitest";
import { GET as listDocuments, POST as createDocumentRoute } from "@/app/api/documents/route";
import {
  DELETE as deleteDocumentRoute,
  GET as getDocumentRoute,
  PATCH as patchDocumentRoute,
} from "@/app/api/documents/[id]/route";
import { prisma } from "@/lib/db";
import {
  EMPTY_DOC,
  anonymousRequest,
  authedRequest,
  createUser,
  jsonBody,
  params,
  resetDatabase,
} from "./helpers";

describe("document API", () => {
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };

  beforeEach(async () => {
    await resetDatabase();
    alice = await createUser({ email: "alice@demo.test", name: "Alice" });
    bob = await createUser({ email: "bob@demo.test", name: "Bob" });
  });

  it("creates a blank document owned by the caller", async () => {
    const response = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", {
        method: "POST",
        body: jsonBody({}),
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.document.title).toBe("Untitled document");
    expect(body.document.ownerId).toBe(alice.id);
    expect(Object.keys(body.document).sort()).toEqual(
      ["createdAt", "id", "ownerId", "title", "updatedAt"].sort()
    );

    const stored = await prisma.document.findUniqueOrThrow({ where: { id: body.document.id } });
    expect(stored.content).toEqual(EMPTY_DOC);
    expect(stored.version).toBe(1);
    expect(stored.ownerId).toBe(alice.id);
  });

  it("trims titles and rejects blank ones", async () => {
    const created = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", {
        method: "POST",
        body: jsonBody({ title: "  Trimmed  " }),
      })
    );
    expect((await created.json()).document.title).toBe("Trimmed");

    const blank = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", {
        method: "POST",
        body: jsonBody({ title: "   " }),
      })
    );
    expect(blank.status).toBe(400);
    const error = await blank.json();
    expect(error.error.code).toBe("VALIDATION_ERROR");
    expect(error.error.fields.title).toBeDefined();
  });

  it("persists title and content updates and increments the version", async () => {
    const created = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", { method: "POST", body: jsonBody({}) })
    );
    const { document } = await created.json();

    const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }] };

    const patched = await patchDocumentRoute(
      await authedRequest(alice.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: jsonBody({ title: "Renamed", content, baseVersion: 1 }),
      }),
      params({ id: document.id })
    );

    expect(patched.status).toBe(200);
    const patchBody = await patched.json();
    expect(patchBody.version).toBe(2);
    expect(patchBody.title).toBe("Renamed");
    expect(new Date(patchBody.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(document.updatedAt).getTime()
    );

    const refetched = await getDocumentRoute(
      await authedRequest(alice.id, `/api/documents/${document.id}`),
      params({ id: document.id })
    );
    expect(refetched.status).toBe(200);
    const refetchedBody = await refetched.json();
    expect(refetchedBody.document.title).toBe("Renamed");
    expect(refetchedBody.document.content).toEqual(content);
    expect(refetchedBody.document.version).toBe(2);
    expect(refetchedBody.myRole).toBe("OWNER");
  });

  it("returns 409 when the client edits a stale version", async () => {
    const created = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", { method: "POST", body: jsonBody({}) })
    );
    const { document } = await created.json();

    await patchDocumentRoute(
      await authedRequest(alice.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: jsonBody({ title: "First" }),
      }),
      params({ id: document.id })
    );

    const stale = await patchDocumentRoute(
      await authedRequest(alice.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: jsonBody({ title: "Second", baseVersion: 1 }),
      }),
      params({ id: document.id })
    );

    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("VERSION_CONFLICT");
  });

  it("rejects malformed JSON and invalid content shapes", async () => {
    const created = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", { method: "POST", body: jsonBody({}) })
    );
    const { document } = await created.json();

    const badJson = await patchDocumentRoute(
      await authedRequest(alice.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: "{not json",
      }),
      params({ id: document.id })
    );
    expect(badJson.status).toBe(400);
    expect((await badJson.json()).error.code).toBe("INVALID_JSON");

    const badContent = await patchDocumentRoute(
      await authedRequest(alice.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: jsonBody({ content: { type: "html", content: [] } }),
      }),
      params({ id: document.id })
    );
    expect(badContent.status).toBe(400);
    expect((await badContent.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("lists owned and shared documents separately", async () => {
    const owned = await prisma.document.create({
      data: { ownerId: alice.id, title: "Alice private", content: EMPTY_DOC },
    });
    const shared = await prisma.document.create({
      data: { ownerId: alice.id, title: "Shared with Bob", content: EMPTY_DOC },
    });
    await prisma.documentShare.create({
      data: { documentId: shared.id, userId: bob.id, role: "VIEWER" },
    });

    const aliceResponse = await listDocuments(
      await authedRequest(alice.id, "/api/documents", { method: "GET" })
    );
    const aliceBody = await aliceResponse.json();
    expect(aliceBody.owned.map((doc: { title: string }) => doc.title).sort()).toEqual([
      "Alice private",
      "Shared with Bob",
    ]);
    expect(aliceBody.shared).toHaveLength(0);
    expect(aliceBody.owned[0]).not.toHaveProperty("content");

    const bobResponse = await listDocuments(
      await authedRequest(bob.id, "/api/documents", { method: "GET" })
    );
    const bobBody = await bobResponse.json();
    expect(bobBody.owned).toHaveLength(0);
    expect(bobBody.shared).toHaveLength(1);
    expect(bobBody.shared[0]).toMatchObject({
      id: shared.id,
      role: "VIEWER",
      owner: { name: "Alice", email: "alice@demo.test" },
    });
    expect(bobBody.shared[0]).not.toHaveProperty("content");
    expect(owned.id).toBeTruthy();
  });

  it("requires authentication for every document endpoint", async () => {
    const created = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", { method: "POST", body: jsonBody({}) })
    );
    const { document } = await created.json();

    const responses = await Promise.all([
      listDocuments(anonymousRequest("/api/documents")),
      createDocumentRoute(anonymousRequest("/api/documents", { method: "POST", body: jsonBody({}) })),
      getDocumentRoute(anonymousRequest(`/api/documents/${document.id}`), params({ id: document.id })),
      patchDocumentRoute(
        anonymousRequest(`/api/documents/${document.id}`, { method: "PATCH", body: jsonBody({ title: "x" }) }),
        params({ id: document.id })
      ),
      deleteDocumentRoute(
        anonymousRequest(`/api/documents/${document.id}`, { method: "DELETE" }),
        params({ id: document.id })
      ),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    }
  });

  it("allows the owner to delete and hides the document afterwards", async () => {
    const created = await createDocumentRoute(
      await authedRequest(alice.id, "/api/documents", { method: "POST", body: jsonBody({}) })
    );
    const { document } = await created.json();

    const deleted = await deleteDocumentRoute(
      await authedRequest(alice.id, `/api/documents/${document.id}`, { method: "DELETE" }),
      params({ id: document.id })
    );
    expect(deleted.status).toBe(204);
    expect(await prisma.document.count()).toBe(0);
  });
});
