import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { badRequest, handleError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/http";
import { prepareImport } from "@/lib/import/convert";
import { createDocumentFromContent } from "@/lib/services/documents";

export const runtime = "nodejs";

/**
 * Multipart import. Files are parsed in memory and never written to disk.
 * `Origin` is checked because multipart/form-data is a simple request that
 * browsers will send cross-site without a preflight.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw badRequest("INVALID_FILE_TYPE", "Upload a .txt or .md file.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw badRequest("INVALID_FILE_TYPE", "Upload a .txt or .md file.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { title, content } = prepareImport(file.name, bytes);
    const document = await createDocumentFromContent(user.id, title, content);

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
