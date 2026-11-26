import { beforeEach, describe, expect, it } from "vitest";
import { GET as getDocumentRoute, PATCH as patchDocumentRoute } from "@/app/api/documents/[id]/route";
import { prisma } from "@/lib/db";
import {
  authedRequest,
  createUser,
  jsonBody,
  params,
  resetDatabase,
  richDocument,
} from "./helpers";

describe("rich text round-trip", () => {
  it("persists every supported format unchanged through PATCH then GET", async () => {
    await resetDatabase();
    const owner = await createUser({ email: "alice@demo.test", name: "Alice" });

    const document = await prisma.document.create({
      data: {
        ownerId: owner.id,
        title: "Formatting",
        content: { type: "doc", content: [{ type: "paragraph" }] },
      },
    });

    const content = richDocument();

    const patch = await patchDocumentRoute(
      await authedRequest(owner.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: jsonBody({ content, baseVersion: 1 }),
      }),
      params({ id: document.id })
    );
    expect(patch.status).toBe(200);
    expect((await patch.json()).version).toBe(2);

    const get = await getDocumentRoute(
      await authedRequest(owner.id, `/api/documents/${document.id}`),
      params({ id: document.id })
    );
    const body = await get.json();

    expect(body.document.content).toEqual(content);

    // Spot-check each mark/node type survived.
    const serialized = JSON.stringify(body.document.content);
    for (const mark of ["bold", "italic", "underline"]) {
      expect(serialized).toContain(`"${mark}"`);
    }
    expect(serialized).toContain('"level":2');
    expect(serialized).toContain("bulletList");
    expect(serialized).toContain("orderedList");

    const stored = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(stored.content).toEqual(content);
  });

  it("supports heading levels 1-3 and nested lists", async () => {
    await resetDatabase();
    const owner = await createUser({ email: "alice@demo.test", name: "Alice" });
    const document = await prisma.document.create({
      data: { ownerId: owner.id, title: "Headings", content: { type: "doc", content: [] } },
    });

    const content = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "One" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Two" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Three" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "parent" }] },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        { type: "paragraph", content: [{ type: "text", text: "child" }] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    await patchDocumentRoute(
      await authedRequest(owner.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: jsonBody({ content }),
      }),
      params({ id: document.id })
    );

    const get = await getDocumentRoute(
      await authedRequest(owner.id, `/api/documents/${document.id}`),
      params({ id: document.id })
    );
    expect((await get.json()).document.content).toEqual(content);
  });

  it("rejects content over 2 MB with 413", async () => {
    await resetDatabase();
    const owner = await createUser({ email: "alice@demo.test", name: "Alice" });
    const document = await prisma.document.create({
      data: { ownerId: owner.id, title: "Huge", content: { type: "doc", content: [] } },
    });

    const huge = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x".repeat(2 * 1024 * 1024 + 100) }],
        },
      ],
    };

    const response = await patchDocumentRoute(
      await authedRequest(owner.id, `/api/documents/${document.id}`, {
        method: "PATCH",
        body: jsonBody({ content: huge }),
      }),
      params({ id: document.id })
    );

    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("FILE_TOO_LARGE");
  });
});
