-- AlterTable
ALTER TABLE "Test" ADD COLUMN "watermark" BOOLEAN NOT NULL DEFAULT false;

-- Test-series tests are paid: their question paper is watermarked by default
UPDATE "Test" SET "watermark" = true WHERE "kind" = 'series';

-- AlterTable
ALTER TABLE "WebsiteSettings" ADD COLUMN "guessSeconds" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "slowSeconds" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN "reportNotice" BOOLEAN NOT NULL DEFAULT true;
