-- A test's solutions PDF in the private file bucket (lib/storage.js).
-- Null = no solutions uploaded.
ALTER TABLE "Test" ADD COLUMN "solutionsKey" TEXT;
ALTER TABLE "Test" ADD COLUMN "solutionsName" TEXT;
ALTER TABLE "Test" ADD COLUMN "solutionsAt" TIMESTAMP(3);
