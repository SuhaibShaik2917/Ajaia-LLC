import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/errors";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";
import type { SessionUser } from "@/types";

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken, verifySessionToken };

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}

export async function findUserById(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  return user ?? null;
}

/** Reads the session cookie from an incoming request (route handlers, tests). */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return findUserById(userId);
}

/** Every API route calls this; middleware is never the only gate. */
export async function requireUser(request: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw unauthorized();
  return user;
}

/** For server components (layouts/pages). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return findUserById(userId);
}
