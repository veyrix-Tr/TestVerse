-- AlterTable
ALTER TABLE "TestSeries" ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "price" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- CreateTable
CREATE TABLE "SeriesBatch" (
    "seriesId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,

    CONSTRAINT "SeriesBatch_pkey" PRIMARY KEY ("seriesId","batchId")
);

-- CreateTable
CREATE TABLE "SeriesGroup" (
    "seriesId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "SeriesGroup_pkey" PRIMARY KEY ("seriesId","groupId")
);

-- CreateTable
CREATE TABLE "SeriesStudent" (
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SeriesStudent_pkey" PRIMARY KEY ("seriesId","userId")
);

-- CreateTable
CREATE TABLE "SeriesOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" INTEGER,
    "paymentRef" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeriesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeriesBatch_batchId_idx" ON "SeriesBatch"("batchId");

-- CreateIndex
CREATE INDEX "SeriesGroup_groupId_idx" ON "SeriesGroup"("groupId");

-- CreateIndex
CREATE INDEX "SeriesStudent_userId_idx" ON "SeriesStudent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesOrder_userId_seriesId_key" ON "SeriesOrder"("userId", "seriesId");

-- CreateIndex
CREATE INDEX "SeriesOrder_seriesId_idx" ON "SeriesOrder"("seriesId");

-- AddForeignKey
ALTER TABLE "SeriesBatch" ADD CONSTRAINT "SeriesBatch_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TestSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesBatch" ADD CONSTRAINT "SeriesBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesGroup" ADD CONSTRAINT "SeriesGroup_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TestSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesGroup" ADD CONSTRAINT "SeriesGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesStudent" ADD CONSTRAINT "SeriesStudent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TestSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesStudent" ADD CONSTRAINT "SeriesStudent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesOrder" ADD CONSTRAINT "SeriesOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesOrder" ADD CONSTRAINT "SeriesOrder_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TestSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
