-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Test_isFree_idx" ON "Test"("isFree");
