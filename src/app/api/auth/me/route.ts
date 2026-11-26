import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
