/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { Toolbar } from "@/components/editor/Toolbar";

afterEach(cleanup);

/** Minimal stand-in for a Tiptap editor that records the commands it receives. */
function fakeEditor(active: Record<string, boolean> = {}) {
  const calls: string[] = [];
  const chain = {
    focus: () => chain,
    toggleBold: () => (calls.push("bold"), chain),
    toggleItalic: () => (calls.push("italic"), chain),
    toggleUnderline: () => (calls.push("underline"), chain),
    toggleHeading: ({ level }: { level: number }) => (calls.push(`h${level}`), chain),
    setParagraph: () => (calls.push("paragraph"), chain),
    toggleBulletList: () => (calls.push("bulletList"), chain),
    toggleOrderedList: () => (calls.push("orderedList"), chain),
    run: () => true,
  };

  const editor = {
    chain: () => chain,
    isActive: (name: string, attrs?: { level?: number }) =>
      attrs?.level ? Boolean(active[`${name}${attrs.level}`]) : Boolean(active[name]),
  };

  return { editor: editor as unknown as Editor, calls };
}

describe("editor toolbar", () => {
  it("routes every button to the matching Tiptap command", () => {
    const { editor, calls } = fakeEditor();
    render(<Toolbar editor={editor} />);

    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    fireEvent.click(screen.getByRole("button", { name: "Italic" }));
    fireEvent.click(screen.getByRole("button", { name: "Underline" }));
    fireEvent.click(screen.getByRole("button", { name: "Bullet list" }));
    fireEvent.click(screen.getByRole("button", { name: "Numbered list" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Text style" }), {
      target: { value: "h2" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Text style" }), {
      target: { value: "paragraph" },
    });

    expect(calls).toEqual([
      "bold",
      "italic",
      "underline",
      "bulletList",
      "orderedList",
      "h2",
      "paragraph",
    ]);
  });

  it("reflects active formats and disabled state", () => {
    const { editor } = fakeEditor({ bold: true, bulletlist: true });
    const { rerender } = render(<Toolbar editor={editor} disabled />);

    const bold = screen.getByRole("button", { name: "Bold" }) as HTMLButtonElement;
    expect(bold.disabled).toBe(true);

    rerender(<Toolbar editor={editor} />);
    expect(bold.disabled).toBe(false);
    expect(bold.getAttribute("aria-pressed")).toBe("true");
  });

  it("does nothing when there is no editor yet", () => {
    render(<Toolbar editor={null} />);
    const bold = screen.getByRole("button", { name: "Bold" }) as HTMLButtonElement;
    expect(bold.disabled).toBe(true);
    fireEvent.click(bold); // must not throw
  });
});
