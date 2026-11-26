import { prisma } from "@/lib/db";
import { AppError, badRequest, notFound } from "@/lib/errors";
import { getDocumentWithAccess } from "@/lib/services/permissions";
import type { ShareItem, ShareRoleValue } from "@/types";

export async function listShares(documentId: string, userId: string): Promise<ShareItem[]> {
  await getDocumentWithAccess(documentId, userId, "owner");

  const shares = await prisma.documentShare.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });

  return shares.map((share) => ({
    userId: share.user.id,
    name: share.user.name,
    email: share.user.email,
    role: share.role as ShareRoleValue,
  }));
}

export async function upsertShare(
  documentId: string,
  ownerId: string,
  email: string,
  role: ShareRoleValue
): Promise<ShareItem> {
  const { document } = await getDocumentWithAccess(documentId, ownerId, "owner");

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (!target) {
    throw new AppError(404, "USER_NOT_FOUND", "No Docket user has that email address.");
  }

  if (target.id === document.ownerId) {
    throw badRequest("CANNOT_SHARE_WITH_SELF", "You already own this document.");
  }

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId, userId: target.id } },
    update: { role },
    create: { documentId, userId: target.id, role },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });

  return {
    userId: share.user.id,
    name: share.user.name,
    email: share.user.email,
    role: share.role as ShareRoleValue,
  };
}

export async function updateShareRole(
  documentId: string,
  ownerId: string,
  targetUserId: string,
  role: ShareRoleValue
): Promise<ShareItem> {
  await getDocumentWithAccess(documentId, ownerId, "owner");

  const existing = await prisma.documentShare.findUnique({
    where: { documentId_userId: { documentId, userId: targetUserId } },
    select: { id: true },
  });

  if (!existing) throw notFound("That collaborator does not have access.");

  const share = await prisma.documentShare.update({
    where: { id: existing.id },
    data: { role },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });

  return {
    userId: share.user.id,
    name: share.user.name,
    email: share.user.email,
    role: share.role as ShareRoleValue,
  };
}

export async function revokeShare(
  documentId: string,
  ownerId: string,
  targetUserId: string
): Promise<void> {
  await getDocumentWithAccess(documentId, ownerId, "owner");

  const existing = await prisma.documentShare.findUnique({
    where: { documentId_userId: { documentId, userId: targetUserId } },
    select: { id: true },
  });

  if (!existing) throw notFound("That collaborator does not have access.");

  await prisma.documentShare.delete({ where: { id: existing.id } });
}
