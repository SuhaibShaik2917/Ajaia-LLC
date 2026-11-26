-- Bootstrap DDL for a fresh Postgres database.
--
-- Primary path: `npx prisma db push` (requires the Prisma schema engine binary).
-- Fallback path: `npm run db:init` (applies this file with the `pg` driver) for
-- environments where the schema engine binary cannot be downloaded.
--
-- Keep in sync with prisma/schema.prisma.

DO $$
BEGIN
    CREATE TYPE "ShareRole" AS ENUM ('VIEWER', 'EDITOR');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT 'Untitled document',
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Document_ownerId_updatedAt_idx"
    ON "Document"("ownerId", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "DocumentShare" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ShareRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentShare_documentId_userId_key"
    ON "DocumentShare"("documentId", "userId");
CREATE INDEX IF NOT EXISTS "DocumentShare_userId_idx" ON "DocumentShare"("userId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_ownerId_fkey') THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey"
            FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentShare_documentId_fkey') THEN
        ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_documentId_fkey"
            FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentShare_userId_fkey') THEN
        ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
