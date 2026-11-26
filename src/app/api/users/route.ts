import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

export const runtime = "nodejs";

/** Directory of demo users, used by the share dialog's email autocomplete. */
export async function GET(request: NextRequest) {
  try {
    const me = await requireUser(request);
    const users = await prisma.user.findMany({
      where: { id: { not: me.id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return handleError(error);
  }
}
