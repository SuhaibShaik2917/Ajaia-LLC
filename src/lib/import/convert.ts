import { marked } from "marked";
import { generateJSON } from "@tiptap/html";
import { editorExtensions } from "@/lib/editor/extensions";
import { badRequest, payloadTooLarge } from "@/lib/errors";
import { MAX_IMPORT_BYTES, MAX_TITLE_LENGTH } from "@/lib/validation";
import type { TiptapDoc, TiptapNode } from "@/types";

export const ALLOWED_IMPORT_EXTENSIONS = [".txt", ".md"] as const;

export type ImportExtension = (typeof ALLOWED_IMPORT_EXTENSIONS)[number];

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = (dot === -1 ? filename : filename.slice(0, dot)).trim();
  const title = base || "Imported document";
  return title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH).trim() : title;
}

/**
 * Validates the upload envelope (extension, size, encoding) and decodes it.
 * Throws AppError with the documented import codes.
 */
export function decodeImport(filename: string, bytes: Uint8Array): {
  text: string;
  extension: ImportExtension;
} {
  const extension = extensionOf(filename);

  if (!ALLOWED_IMPORT_EXTENSIONS.includes(extension as ImportExtension)) {
    throw badRequest(
      "INVALID_FILE_TYPE",
      "Only .txt and .md files can be imported."
    );
  }

  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw payloadTooLarge("Imported files must be 1 MB or smaller.");
  }

  if (bytes.byteLength === 0) {
    throw badRequest("EMPTY_FILE", "That file is empty.");
  }

  if (bytes.includes(0)) {
    throw badRequest("INVALID_ENCODING", "That file is not UTF-8 text.");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw badRequest("INVALID_ENCODING", "That file is not valid UTF-8 text.");
  }

  if (text.trim().length === 0) {
    throw badRequest("EMPTY_FILE", "That file has no text content.");
  }

  return { text: text.replace(/\r\n?/g, "\n"), extension: extension as ImportExtension };
}

function textToDoc(text: string): TiptapDoc {
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (blocks.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  const content: TiptapNode[] = blocks.map((block) => {
    const nodes: TiptapNode[] = [];
    block.split("\n").forEach((line, index) => {
      if (index > 0) nodes.push({ type: "hardBreak" });
      if (line.length > 0) nodes.push({ type: "text", text: line });
    });
    return { type: "paragraph", content: nodes };
  });

  return { type: "doc", content };
}

function markdownToDoc(markdown: string): TiptapDoc {
  try {
    // `marked` on a string input is synchronous; generateJSON runs entirely in
    // memory (zeed-dom) so unknown tags such as <script> are dropped by the
    // Tiptap schema instead of reaching the database.
    const html = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
    const json = generateJSON(html, editorExtensions) as TiptapDoc;
    if (!json || json.type !== "doc") return textToDoc(markdown);
    return json;
  } catch {
    // Never fail an import because of an exotic markdown construct.
    return textToDoc(markdown);
  }
}

/** Pure converter: filename + decoded text -> Tiptap JSON document. */
export function convertFileToTiptap(filename: string, text: string): TiptapDoc {
  const extension = extensionOf(filename);
  return extension === ".md" ? markdownToDoc(text) : textToDoc(text);
}

/** Convenience wrapper used by the import route. */
export function prepareImport(filename: string, bytes: Uint8Array): {
  title: string;
  content: TiptapDoc;
} {
  const { text } = decodeImport(filename, bytes);
  return { title: titleFromFilename(filename), content: convertFileToTiptap(filename, text) };
}
