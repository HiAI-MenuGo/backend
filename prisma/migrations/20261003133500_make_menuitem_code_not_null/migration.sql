-- Backfill any NULL code if exists
UPDATE "MenuItem" SET "code" = 'ITEM-' || SUBSTRING("id", 1, 8) WHERE "code" IS NULL;

-- AlterTable
ALTER TABLE "MenuItem" ALTER COLUMN "code" SET NOT NULL;
