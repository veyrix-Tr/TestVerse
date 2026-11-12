-- Resources can now be a YouTube video or a whole playlist; existing rows are
-- videos, so the default keeps them working without a backfill.
ALTER TABLE "Resource" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'video';
