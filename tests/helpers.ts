import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signSessionToken } from "@/lib/session";
import type { TiptapDoc } from "@/types";

export const TEST_PASSWORD = "Demo@1234";
export const BASE_URL = "http://localhost:3000";

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "DocumentShare", "Document", "User" RESTART IDENTITY CASCADE'
  );
}

type CreateUserInput = { email: string; name?: string; password?: string };

export async function createUser({ email, name, password = TEST_PASSWORD }: CreateUserInput) {
  const passwordHash = await bcrypt.hash(password, 4);
  return prisma.user.create({
    data: { email, name: name ?? email.split("@")[0], passwordHash },
  });
}

/** Builds a NextRequest carrying a valid session cookie for `userId`. */
export async function authedRequest(
  userId: string,
  path: string,
  init: RequestInit = {}
): Promise<NextRequest> {
  const token = await signSessionToken(userId);
  const headers = new Headers(init.headers);
  headers.set("cookie", `docket_session=${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new NextRequest(new URL(path, BASE_URL), {
    ...init,
    headers,
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

export function anonymousRequest(path: string, init: RequestInit = {}): NextRequest {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new NextRequest(new URL(path, BASE_URL), {
    ...init,
    headers,
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

export function params<T extends Record<string, string>>(values: T): { params: T } {
  return { params: values };
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

/** A document exercising every format the toolbar exposes. */
export function richDocument(): TiptapDoc {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Rich heading" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "bold" },
          { type: "text", text: " " },
          { type: "text", marks: [{ type: "italic" }], text: "italic" },
          { type: "text", text: " " },
          { type: "text", marks: [{ type: "underline" }], text: "underline" },
        ],
      },
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "bullet one" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "bullet two" }] }] },
        ],
      },
      {
        type: "orderedList",
        attrs: { start: 1 },
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "first" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "second" }] }] },
        ],
      },
    ],
  };
}

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
