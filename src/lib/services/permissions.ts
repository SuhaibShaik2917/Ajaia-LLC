import { prisma } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import type { Role } from "@/types";

export type RequiredAccess = "view" | "edit" | "owner";

const RANK: Record<Role, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };
const MINIMUM_ROLE: Record<RequiredAccess, Role> = {
  view: "VIEWER",
  edit: "EDITOR",
  owner: "OWNER",
};

export type DocumentForAccess = {
  id: string;
  ownerId: string;
  title: string;
  content: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentAccess = {
  document: DocumentForAccess;
  myRole: Role;
};

/**
 * The single source of truth for document permissions.
 *
 * - effective role = OWNER when ownerId === userId, otherwise the share role.
 * - no access  -> 404 (never leak that the document exists)
 * - insufficient role -> 403
 */
export async function getDocumentWithAccess(
  documentId: string,
  userId: string,
  required: RequiredAccess
): Promise<DocumentAccess> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      shares: { where: { userId }, select: { role: true } },
    },
  });

  if (!document) throw notFound("Document not found.");

  const shareRole = document.shares[0]?.role;
  const myRole: Role | null =
    document.ownerId === userId ? "OWNER" : shareRole ? (shareRole as Role) : null;

  if (!myRole) throw notFound("Document not found.");

  if (RANK[myRole] < RANK[MINIMUM_ROLE[required]]) {
    throw forbidden(
      required === "owner"
        ? "Only the document owner can do that."
        : "You only have view access to this document."
    );
  }

  const { shares: _shares, ...rest } = document;
  return { document: rest, myRole };
}

export function roleRank(role: Role): number {
  return RANK[role];
}

export function canEdit(role: Role): boolean {
  return RANK[role] >= RANK.EDITOR;
}
