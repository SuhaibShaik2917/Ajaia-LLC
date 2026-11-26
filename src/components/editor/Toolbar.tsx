"use client";

import type { Editor } from "@tiptap/react";
import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";

type ToolbarProps = {
  editor: Editor | null;
  disabled?: boolean;
};

const buttonBase =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors";

function buttonClass(active: boolean, disabled: boolean) {
  const tone = active
    ? "bg-brand-50 text-brand-700"
    : "text-ink hover:bg-surface";
  return `${buttonBase} ${tone} ${disabled ? "cursor-not-allowed opacity-40" : ""}`;
}

export function Toolbar({ editor, disabled = false }: ToolbarProps) {
  const isDisabled = disabled || !editor;

  const blockValue = !editor
    ? "paragraph"
    : editor.isActive("heading", { level: 1 })
      ? "h1"
      : editor.isActive("heading", { level: 2 })
        ? "h2"
        : editor.isActive("heading", { level: 3 })
          ? "h3"
          : "paragraph";

  const setBlock = (value: string) => {
    if (!editor || isDisabled) return;
    if (value === "paragraph") editor.chain().focus().setParagraph().run();
    else {
      const level = Number(value.replace("h", "")) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      aria-disabled={isDisabled}
      className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-line bg-white/95 px-2 py-2 backdrop-blur sm:px-3"
    >
      <button
        type="button"
        aria-label="Bold"
        aria-pressed={editor?.isActive("bold") ?? false}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        className={buttonClass(editor?.isActive("bold") ?? false, isDisabled)}
      >
        <Bold className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        aria-label="Italic"
        aria-pressed={editor?.isActive("italic") ?? false}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        className={buttonClass(editor?.isActive("italic") ?? false, isDisabled)}
      >
        <Italic className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        aria-label="Underline"
        aria-pressed={editor?.isActive("underline") ?? false}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        className={buttonClass(editor?.isActive("underline") ?? false, isDisabled)}
      >
        <Underline className="h-4 w-4" aria-hidden />
      </button>

      <span className="mx-1 h-5 w-px bg-line" aria-hidden />

      <select
        aria-label="Text style"
        value={blockValue}
        disabled={isDisabled}
        onChange={(event) => setBlock(event.target.value)}
        className={`h-8 rounded-md border border-line bg-white px-2 text-[13px] text-ink ${
          isDisabled ? "cursor-not-allowed opacity-40" : ""
        }`}
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <span className="mx-1 h-5 w-px bg-line" aria-hidden />

      <button
        type="button"
        aria-label="Bullet list"
        aria-pressed={editor?.isActive("bulletList") ?? false}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor?.isActive("bulletList") ?? false, isDisabled)}
      >
        <List className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        aria-label="Numbered list"
        aria-pressed={editor?.isActive("orderedList") ?? false}
        disabled={isDisabled}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor?.isActive("orderedList") ?? false, isDisabled)}
      >
        <ListOrdered className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
