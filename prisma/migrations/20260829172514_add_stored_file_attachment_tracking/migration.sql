-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN "attachedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StoredFile_provider_attachedAt_createdAt_idx" ON "StoredFile"("provider", "attachedAt", "createdAt");
