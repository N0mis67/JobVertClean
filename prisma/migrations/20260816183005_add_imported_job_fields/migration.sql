/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `JobPost` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "externalUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "importScore" INTEGER,
ADD COLUMN     "importScoreReasons" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "rawPayload" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "JobPost_externalId_key" ON "JobPost"("externalId");
