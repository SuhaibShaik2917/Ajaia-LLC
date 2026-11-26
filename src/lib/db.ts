import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 is Rust-free: it needs a driver adapter, which we point at the
// pooled Postgres URL (Supabase pooler / direct URL in development).
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Next.js hot reload would otherwise open a new pool on every edit.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
