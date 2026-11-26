import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { assertSameOrigin, parseJsonBody } from "@/lib/http";
import { updateShareSchema } from "@/lib/validation";
import { revokeShare, updateShareRole } from "@/lib/services/shares";

export const runtime = "nodejs";

type RouteContext = { params: { id: string; userId: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const input = await parseJsonBody(request, updateShareSchema);
    const share = await updateShareRole(params.id, user.id, params.userId, input.role);
    return NextResponse.json({ share });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await revokeShare(params.id, user.id, params.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
