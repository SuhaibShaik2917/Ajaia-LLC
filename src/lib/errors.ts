import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@/types";

/**
 * The only error type route handlers/services should throw for expected
 * failures. `handleError` turns it into the documented API error shape.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[] | undefined>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[] | undefined>
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (code: string, message: string, fields?: Record<string, string[]>) =>
  new AppError(400, code, message, fields);

export const unauthorized = (message = "You must be signed in.") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have permission to do that.") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "Not found.") => new AppError(404, "NOT_FOUND", message);

export const conflict = (
  code: string,
  message: string,
  fields?: Record<string, string[]>
) => new AppError(409, code, message, fields);

export const payloadTooLarge = (message = "That file is too large.") =>
  new AppError(413, "FILE_TOO_LARGE", message);

function prismaCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : undefined;
}

function isPrismaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return (
    typeof name === "string" &&
    (name.startsWith("PrismaClient") || name === "PrismaClientKnownRequestError")
  );
}

/** Maps anything thrown in a route handler to the documented error response. */
export function handleError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    const fields = error.flatten().fieldErrors as Record<string, string[] | undefined>;
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request was invalid.",
          fields,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      },
      { status: error.status }
    );
  }

  // Prisma errors never leak internals to the client.
  const code = prismaCode(error);
  if (code || isPrismaError(error)) {
    if (code === "P2002") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "That record already exists." } },
        { status: 409 }
      );
    }
    if (code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Not found." } },
        { status: 404 }
      );
    }
    console.error("[api] database error", code ?? "(unknown)");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }

  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 }
  );
}
