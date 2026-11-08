-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exam" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "price" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" INTEGER,
    "paymentRef" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_name_key" ON "Batch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_exam_grade_key" ON "Batch"("exam", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_batchId_idx" ON "Subscription"("batchId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: the six batches (exam × class). Prices stay null until decided;
-- admins can change names, prices and availability later.
INSERT INTO "Batch" ("id", "name", "exam", "grade", "sortOrder", "updatedAt") VALUES
  ('batch_11_jee',      '11th JEE',     'jee',  'Class 11',           1, CURRENT_TIMESTAMP),
  ('batch_12_jee',      '12th JEE',     'jee',  'Class 12',           2, CURRENT_TIMESTAMP),
  ('batch_dropper_jee', 'Dropper JEE',  'jee',  'Dropper / repeater', 3, CURRENT_TIMESTAMP),
  ('batch_11_neet',     '11th NEET',    'neet', 'Class 11',           4, CURRENT_TIMESTAMP),
  ('batch_12_neet',     '12th NEET',    'neet', 'Class 12',           5, CURRENT_TIMESTAMP),
  ('batch_dropper_neet','Dropper NEET', 'neet', 'Dropper / repeater', 6, CURRENT_TIMESTAMP);
