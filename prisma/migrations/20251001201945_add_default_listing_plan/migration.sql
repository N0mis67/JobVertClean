-- CreateTable
CREATE TABLE "PlanCredit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plan" "ListingPlan" NOT NULL,
    "creditsPurchased" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanCredit_companyId_plan_key" ON "PlanCredit"("companyId", "plan");

-- AddForeignKey
ALTER TABLE "PlanCredit" ADD CONSTRAINT "PlanCredit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
