import { describe, expect, it } from "vitest";
import { generateHTML } from "@tiptap/html";
import { editorExtensions } from "@/lib/editor/extensions";
import { convertFileToTiptap } from "@/lib/import/convert";
import { richDocument } from "./helpers";

/**
 * The editor, importer and toolbar all share one extension set. Rendering a
 * document through it proves each toolbar format is actually serialisable, which
 * is what the editor shows after a reload.
 */
describe("shared extension set", () => {
  it("renders every toolbar format to HTML", () => {
    const html = generateHTML(richDocument(), editorExtensions);

    expect(html).toContain("<h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>underline</u>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>");
  });

  it("renders headings 1-3 and hard breaks", () => {
    const html = generateHTML(
      {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "One" }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Two" }] },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Three" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "a" },
              { type: "hardBreak" },
              { type: "text", text: "b" },
            ],
          },
        ],
      },
      editorExtensions
    );

    expect(html).toContain("<h1>One</h1>");
    expect(html).toContain("<h2>Two</h2>");
    expect(html).toContain("<h3>Three</h3>");
    expect(html).toContain("<br>");
  });

  it("produces markdown imports that render with the same extensions", () => {
    const doc = convertFileToTiptap(
      "plan.md",
      "# Plan\n\n## Goals\n\n**ship** the editor with _italic_ support\n\n- a\n- b\n\n1. one\n2. two\n"
    );
    const html = generateHTML(doc, editorExtensions);

    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<h2>Goals</h2>");
    expect(html).toContain("<strong>ship</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
  });

  it("treats __x__ as CommonMark bold, never as underline", () => {
    const doc = convertFileToTiptap("plan.md", "Hello __world__\n");
    const html = generateHTML(doc, editorExtensions);
    expect(html).toContain("<strong>world</strong>");
    expect(html).not.toContain("<u>");
  });
});
