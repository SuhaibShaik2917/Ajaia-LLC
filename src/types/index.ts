/** Shared API/app types. Everything here is serialisable JSON. */

export type Role = "OWNER" | "EDITOR" | "VIEWER";
export type ShareRoleValue = "EDITOR" | "VIEWER";

/** Tiptap/ProseMirror JSON. Re-exported so server code shares the editor types. */
import type { JSONContent } from "@tiptap/core";

export type TiptapNode = JSONContent;

/** A document always has type "doc"; the validator enforces it at runtime. */
export type TiptapDoc = JSONContent & { type: "doc" };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export type PublicUser = SessionUser;

export type DocSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
};

export type SharedDocSummary = DocSummary & {
  role: ShareRoleValue;
  owner: { name: string; email: string };
};

export type DocumentDetail = DocSummary & {
  content: TiptapDoc;
  version: number;
};

export type DocumentWithRole = {
  document: DocumentDetail;
  myRole: Role;
};

export type DocumentPatchResult = {
  id: string;
  version: number;
  updatedAt: string;
  title: string;
};

export type ShareItem = {
  userId: string;
  name: string;
  email: string;
  role: ShareRoleValue;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[] | undefined>;
  };
};
