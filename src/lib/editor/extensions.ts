import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import type { Extensions } from "@tiptap/core";

/**
 * The single extension set shared by the editor, the server-side markdown
 * importer and any HTML→JSON conversion. Keeping one list means imported
 * documents always contain nodes the editor can render.
 *
 * StarterKit v2 covers: paragraph, heading (1-6), bold, italic, strike, code,
 * bulletList, orderedList, listItem, blockquote, codeBlock, horizontalRule,
 * hardBreak and history.
 */
export const editorExtensions: Extensions = [StarterKit, Underline];

/** Marks/nodes the toolbar exposes. */
export const TOOLBAR_HEADING_LEVELS = [1, 2, 3] as const;
