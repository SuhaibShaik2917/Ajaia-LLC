import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { assertSameOrigin, parseJsonBody } from "@/lib/http";
import { createDocumentSchema } from "@/lib/validation";
import { createDocument, listDocuments } from "@/lib/services/documents";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const documents = await listDocuments(user.id);
    return NextResponse.json(documents);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const input = await parseJsonBody(request, createDocumentSchema);
    const document = await createDocument(user.id, input.title);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
