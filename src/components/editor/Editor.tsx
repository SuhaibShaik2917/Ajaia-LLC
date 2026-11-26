"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { editorExtensions } from "@/lib/editor/extensions";
import type { TiptapDoc } from "@/types";
import { Toolbar } from "@/components/editor/Toolbar";

type EditorProps = {
  content: TiptapDoc;
  editable: boolean;
  onUpdate: (content: TiptapDoc) => void;
};

export function Editor({ content, editable, onUpdate }: EditorProps) {
  const editor = useEditor({
    extensions: editorExtensions,
    content,
    editable,
    // Prevents SSR/CSR markup mismatches in the App Router.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        "aria-label": editable ? "Document editor" : "Document content (read-only)",
        role: "textbox",
        "aria-multiline": "true",
        "aria-readonly": String(!editable),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onUpdate(instance.getJSON() as TiptapDoc);
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className="docket-editor" data-readonly={String(!editable)}>
      <Toolbar editor={editor} disabled={!editable} />
      <div className="px-5 py-6 sm:px-10 sm:py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
