import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getDocumentWithAccess } from "@/lib/services/permissions";
import type {
  DocSummary,
  DocumentDetail,
  DocumentPatchResult,
  DocumentWithRole,
  SharedDocSummary,
  TiptapDoc,
} from "@/types";

export const EMPTY_DOC: TiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };
export const DEFAULT_TITLE = "Untitled document";

type DocumentRow = {
  id: string;
  ownerId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

function toSummary(row: DocumentRow): DocSummary {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type DocumentLists = {
  owned: DocSummary[];
  shared: SharedDocSummary[];
};

export async function listDocuments(userId: string): Promise<DocumentLists> {
  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, ownerId: true, title: true, createdAt: true, updatedAt: true },
    }),
    prisma.documentShare.findMany({
      where: { userId },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: {
            id: true,
            ownerId: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return {
    owned: owned.map(toSummary),
    shared: shared.map((share) => ({
      ...toSummary(share.document),
      role: share.role as SharedDocSummary["role"],
      owner: share.document.owner,
    })),
  };
}

export async function createDocument(userId: string, title?: string): Promise<DocSummary> {
  const document = await prisma.document.create({
    data: {
      ownerId: userId,
      title: title?.trim() || DEFAULT_TITLE,
      content: EMPTY_DOC as never,
    },
    select: { id: true, ownerId: true, title: true, createdAt: true, updatedAt: true },
  });
  return toSummary(document);
}

export async function getDocument(documentId: string, userId: string): Promise<DocumentWithRole> {
  const { document, myRole } = await getDocumentWithAccess(documentId, userId, "view");
  const detail: DocumentDetail = {
    ...toSummary(document),
    content: document.content as TiptapDoc,
    version: document.version,
  };
  return { document: detail, myRole };
}

export type UpdateDocumentInput = {
  title?: string;
  content?: TiptapDoc;
  baseVersion?: number;
};

export async function updateDocument(
  documentId: string,
  userId: string,
  input: UpdateDocumentInput
): Promise<DocumentPatchResult> {
  const { document } = await getDocumentWithAccess(documentId, userId, "edit");

  // Optimistic concurrency: last write wins unless the client told us which
  // version it edited. A stale baseVersion is a conflict (409).
  if (input.baseVersion !== undefined && input.baseVersion !== document.version) {
    throw new AppError(
      409,
      "VERSION_CONFLICT",
      "This document was updated elsewhere. Reload to get the latest version.",
      { baseVersion: [`Expected version ${document.version}.`] }
    );
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content as never } : {}),
      version: { increment: 1 },
    },
    select: { id: true, title: true, version: true, updatedAt: true },
  });

  return {
    id: updated.id,
    title: updated.title,
    version: updated.version,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  await getDocumentWithAccess(documentId, userId, "owner");
  await prisma.document.delete({ where: { id: documentId } });
}

/** Creates a document from already-converted content (used by import). */
export async function createDocumentFromContent(
  userId: string,
  title: string,
  content: TiptapDoc
): Promise<DocSummary> {
  const document = await prisma.document.create({
    data: { ownerId: userId, title, content: content as never },
    select: { id: true, ownerId: true, title: true, createdAt: true, updatedAt: true },
  });
  return toSummary(document);
}
