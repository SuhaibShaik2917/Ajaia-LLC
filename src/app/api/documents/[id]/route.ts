import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, payloadTooLarge } from "@/lib/errors";
import { assertSameOrigin, parseJsonBody } from "@/lib/http";
import { MAX_CONTENT_BYTES, patchDocumentSchema } from "@/lib/validation";
import { deleteDocument, getDocument, updateDocument } from "@/lib/services/documents";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser(request);
    const result = await getDocument(params.id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const input = await parseJsonBody(request, patchDocumentSchema);

    if (input.content !== undefined) {
      const bytes = Buffer.byteLength(JSON.stringify(input.content), "utf8");
      if (bytes > MAX_CONTENT_BYTES) {
        throw payloadTooLarge("Document content must be 2 MB or smaller.");
      }
    }

    const result = await updateDocument(params.id, user.id, input);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await deleteDocument(params.id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
