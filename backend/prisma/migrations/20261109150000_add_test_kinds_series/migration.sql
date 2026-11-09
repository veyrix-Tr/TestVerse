-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'live',
ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "TestSeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "exam" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Test_kind_idx" ON "Test"("kind");

-- CreateIndex
CREATE INDEX "Test_seriesId_idx" ON "Test"("seriesId");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TestSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing tests: free mocks go to "Free tests", everything else to "Live tests"
UPDATE "Test" SET "kind" = 'free' WHERE "isFree" = true;
