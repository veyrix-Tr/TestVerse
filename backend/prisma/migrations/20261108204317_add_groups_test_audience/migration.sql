-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'all';

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "TestBatch" (
    "testId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,

    CONSTRAINT "TestBatch_pkey" PRIMARY KEY ("testId","batchId")
);

-- CreateTable
CREATE TABLE "TestGroup" (
    "testId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "TestGroup_pkey" PRIMARY KEY ("testId","groupId")
);

-- CreateTable
CREATE TABLE "TestStudent" (
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TestStudent_pkey" PRIMARY KEY ("testId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "TestBatch_batchId_idx" ON "TestBatch"("batchId");

-- CreateIndex
CREATE INDEX "TestGroup_groupId_idx" ON "TestGroup"("groupId");

-- CreateIndex
CREATE INDEX "TestStudent_userId_idx" ON "TestStudent"("userId");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestBatch" ADD CONSTRAINT "TestBatch_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestBatch" ADD CONSTRAINT "TestBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestGroup" ADD CONSTRAINT "TestGroup_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestGroup" ADD CONSTRAINT "TestGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStudent" ADD CONSTRAINT "TestStudent_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStudent" ADD CONSTRAINT "TestStudent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
