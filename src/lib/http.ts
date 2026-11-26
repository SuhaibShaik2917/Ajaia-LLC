import type { NextRequest } from "next/server";
import { AppError, badRequest, payloadTooLarge } from "@/lib/errors";
import { MAX_CONTENT_BYTES } from "@/lib/validation";

/**
 * Parses and validates a JSON body. Invalid JSON and oversized payloads are
 * reported with the documented error codes instead of a 500.
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: { parse: (input: unknown) => T }
): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CONTENT_BYTES * 2) {
    throw payloadTooLarge("That request body is too large.");
  }

  const raw = await request.text();
  if (!raw) throw badRequest("INVALID_JSON", "A JSON body is required.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw badRequest("INVALID_JSON", "The request body is not valid JSON.");
  }

  return schema.parse(json);
}

/**
 * CSRF guard for cookie-authenticated mutations. Browsers always send Origin
 * on cross-site POSTs; a mismatched origin is rejected.
 */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // same-origin fetches from some clients omit it

  const host = request.headers.get("host");
  const allowed = new Set<string>();
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  const configured = process.env.APP_ORIGIN;
  if (configured) allowed.add(configured.replace(/\/$/, ""));

  if (!allowed.has(origin)) {
    throw new AppError(403, "INVALID_ORIGIN", "Cross-site request blocked.");
  }
}
