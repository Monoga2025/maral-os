-- Safe migration: convert CustomerSegment and ClientCategory enums to TEXT
-- Uses USING cast so existing data is preserved

-- 1. Drop default on Client.segment (it references the enum)
ALTER TABLE "Client" ALTER COLUMN "segment" DROP DEFAULT;
-- Convert segment column from enum to TEXT preserving values
ALTER TABLE "Client" ALTER COLUMN "segment" TYPE TEXT USING "segment"::text;

-- 2. Drop default on Client.category (it references the enum)
ALTER TABLE "Client" ALTER COLUMN "category" DROP DEFAULT;
-- Convert category column from enum to TEXT preserving values
ALTER TABLE "Client" ALTER COLUMN "category" TYPE TEXT USING "category"::text;
-- Restore default as plain string
ALTER TABLE "Client" ALTER COLUMN "category" SET DEFAULT 'PROSPECTO';

-- 3. Drop old enum types (no longer referenced)
DROP TYPE IF EXISTS "CustomerSegment";
DROP TYPE IF EXISTS "ClientCategory";

-- 4. Create Segment table
CREATE TABLE IF NOT EXISTS "Segment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Segment_code_key" ON "Segment"("code");

-- 5. Create Category table
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Category_code_key" ON "Category"("code");
