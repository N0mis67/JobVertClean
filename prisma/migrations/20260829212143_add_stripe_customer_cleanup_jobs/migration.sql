-- CreateEnum
CREATE TYPE "StripeCustomerCleanupStatus" AS ENUM ('PENDING', 'PROCESSING');

-- CreateTable
CREATE TABLE "StripeCustomerCleanupJob" (
    "id" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "status" "StripeCustomerCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeCustomerCleanupJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeCustomerCleanupJob_stripeCustomerId_key" ON "StripeCustomerCleanupJob"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "StripeCustomerCleanupJob_status_nextAttemptAt_idx" ON "StripeCustomerCleanupJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "StripeCustomerCleanupJob_status_lockedAt_idx" ON "StripeCustomerCleanupJob"("status", "lockedAt");
