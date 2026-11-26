import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { handleError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST() {
  try {
    return clearSessionCookie(new NextResponse(null, { status: 204 }));
  } catch (error) {
    return handleError(error);
  }
}
