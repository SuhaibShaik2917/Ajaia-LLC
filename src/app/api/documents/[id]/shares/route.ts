import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { assertSameOrigin, parseJsonBody } from "@/lib/http";
import { createShareSchema } from "@/lib/validation";
import { listShares, upsertShare } from "@/lib/services/shares";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser(request);
    const shares = await listShares(params.id, user.id);
    return NextResponse.json({ shares });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const input = await parseJsonBody(request, createShareSchema);
    const share = await upsertShare(params.id, user.id, input.email, input.role);
    return NextResponse.json({ share });
  } catch (error) {
    return handleError(error);
  }
}
