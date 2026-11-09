-- DropIndex
DROP INDEX "Attempt_testId_userId_key";

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "attemptNo" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_testId_userId_attemptNo_key" ON "Attempt"("testId", "userId", "attemptNo");
