-- A JEE test's paper pattern: "main" | "advanced". Null for NEET tests, tests
-- with no exam, and JEE tests made before this (shown as plain "JEE").
ALTER TABLE "Test" ADD COLUMN "pattern" TEXT;
