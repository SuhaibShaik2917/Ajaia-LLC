import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { AppError, handleError, unauthorized } from "@/lib/errors";
import { parseJsonBody } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { attachSessionCookie, signSessionToken } from "@/lib/auth";
import {
  isRateLimited,
  registerFailedAttempt,
  resetAttempts,
  secondsUntilUnlocked,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await parseJsonBody(request, loginSchema);
    const limiterKey = email;

    if (isRateLimited(limiterKey)) {
      const seconds = secondsUntilUnlocked(limiterKey);
      throw new AppError(
        429,
        "TOO_MANY_ATTEMPTS",
        `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      registerFailedAttempt(limiterKey);
      // Generic message: never reveal whether the email exists.
      throw unauthorized("Invalid email or password.");
    }

    resetAttempts(limiterKey);

    const token = await signSessionToken(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
    return attachSessionCookie(response, token);
  } catch (error) {
    return handleError(error);
  }
}
