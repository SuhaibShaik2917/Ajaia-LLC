import { beforeEach, describe, expect, it } from "vitest";
import { POST as importRoute } from "@/app/api/documents/import/route";
import { convertFileToTiptap, decodeImport, titleFromFilename } from "@/lib/import/convert";
import { prisma } from "@/lib/db";
import { anonymousRequest, authedRequest, createUser, resetDatabase } from "./helpers";
import type { TiptapDoc } from "@/types";

function uploadRequest(userId: string | null, filename: string, content: string | Uint8Array) {
  const form = new FormData();
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: "text/plain" })
      : new Blob([content as unknown as BlobPart], { type: "application/octet-stream" });
  form.append("file", blob, filename);

  const path = "/api/documents/import";
  return userId
    ? authedRequest(userId, path, { method: "POST", body: form })
    : anonymousRequest(path, { method: "POST", body: form });
}

function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const value = node as { text?: string; content?: unknown[] };
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.content)) return value.content.map(textOf).join("");
  return "";
}

describe("import converter", () => {
  it("converts markdown into headings, formatting and lists", () => {
    const markdown = [
      "# Title",
      "",
      "Some **bold** and *italic* text.",
      "",
      "- one",
      "- two",
      "",
      "1. first",
      "2. second",
      "",
      "## Sub",
    ].join("\n");

    const doc = convertFileToTiptap("notes.md", markdown) as TiptapDoc;
    const types = (doc.content ?? []).map((node) => node.type);

    expect(types).toContain("heading");
    expect(types).toContain("bulletList");
    expect(types).toContain("orderedList");

    const first = doc.content?.[0];
    expect(first).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(textOf(first)).toBe("Title");

    const paragraph = doc.content?.[1];
    const marks = (paragraph?.content ?? []).flatMap((node) =>
      (node.marks ?? []).map((mark) => mark.type)
    );
    expect(marks).toEqual(expect.arrayContaining(["bold", "italic"]));

    const bullet = doc.content?.find((node) => node.type === "bulletList");
    expect(bullet?.content).toHaveLength(2);
  });

  it("strips unsafe tags such as <script>", () => {
    const doc = convertFileToTiptap("x.md", "# Safe\n\n<script>alert(1)</script>\n\nBody");
    expect(JSON.stringify(doc)).not.toContain("script");
    expect(JSON.stringify(doc)).toContain("Body");
  });

  it("converts .txt into paragraphs with hard breaks", () => {
    const doc = convertFileToTiptap("plain.txt", "First para.\n\nSecond line one\nline two");
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[1]).toMatchObject({ type: "paragraph" });
    expect(doc.content?.[1]?.content?.some((node) => node.type === "hardBreak")).toBe(true);
  });

  it("derives titles from filenames", () => {
    expect(titleFromFilename("Quarterly plan.md")).toBe("Quarterly plan");
    expect(titleFromFilename("README")).toBe("README");
    expect(titleFromFilename(".md")).toBe("Imported document");
  });

  it("rejects null bytes and invalid UTF-8", () => {
    expect(() => decodeImport("a.txt", new Uint8Array([0x68, 0x00, 0x69]))).toThrowError(
      /UTF-8/
    );
    // 0xE9 alone is not valid UTF-8.
    expect(() => decodeImport("a.txt", new Uint8Array([0x63, 0xe9]))).toThrowError(/UTF-8/);
  });
});

describe("import route", () => {
  let user: { id: string; email: string };

  beforeEach(async () => {
    await resetDatabase();
    user = await createUser({ email: "alice@demo.test", name: "Alice" });
  });

  it("imports markdown into a new document owned by the caller", async () => {
    const response = await importRoute(
      await uploadRequest(user.id, "Launch notes.md", "# Launch notes\n\n- ship it")
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.document.title).toBe("Launch notes");
    expect(body.document.ownerId).toBe(user.id);

    const stored = await prisma.document.findUniqueOrThrow({ where: { id: body.document.id } });
    const content = stored.content as TiptapDoc;
    expect(content.type).toBe("doc");
    expect(content.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
  });

  it("imports plain text", async () => {
    const response = await importRoute(
      await uploadRequest(user.id, "todo.txt", "First thing\n\nSecond thing")
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.document.title).toBe("todo");
  });

  it("rejects unsupported extensions", async () => {
    const response = await importRoute(await uploadRequest(user.id, "report.pdf", "%PDF-1.4"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_FILE_TYPE");
    expect(await prisma.document.count()).toBe(0);
  });

  it("rejects empty files", async () => {
    const response = await importRoute(await uploadRequest(user.id, "empty.md", ""));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("EMPTY_FILE");
  });

  it("rejects files over 1 MB with 413", async () => {
    const big = `# Big\n\n${"x".repeat(1024 * 1024 + 10)}`;
    const response = await importRoute(await uploadRequest(user.id, "big.md", big));
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects invalid UTF-8 with 400", async () => {
    const response = await importRoute(
      await uploadRequest(user.id, "latin1.txt", new Uint8Array([0x63, 0x61, 0x66, 0xe9]))
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_ENCODING");
  });

  it("requires a session", async () => {
    const response = await importRoute(
      anonymousRequest("/api/documents/import", {
        method: "POST",
        body: (() => {
          const form = new FormData();
          form.append("file", new Blob(["# hi"], { type: "text/markdown" }), "x.md");
          return form;
        })(),
      })
    );
    expect(response.status).toBe(401);
  });

  it("blocks cross-origin uploads", async () => {
    const request = await uploadRequest(user.id, "x.md", "# hi");
    const evil = new Request(request.url, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "", origin: "https://evil.example" },
      body: (await request.formData()) as unknown as BodyInit,
    });
    const { NextRequest } = await import("next/server");
    const response = await importRoute(new NextRequest(evil));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("INVALID_ORIGIN");
  });
});
