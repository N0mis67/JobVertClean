import "server-only";
import { JobPostStatus, ListingPlan } from "@prisma/client";
import { PlanUsage, ListingPlanName, AutoSelectionReason } from "@/types/subscription";
import { prisma } from "./db";
import { jobListingDurationPricing } from "./pricingTiers";

const planMetadata = jobListingDurationPricing.reduce(
  (acc, tier) => {
    acc[tier.name as ListingPlanName] = tier;
    return acc;
  },
  {} as Record<ListingPlanName, (typeof jobListingDurationPricing)[number]>
);

export async function getCompanyPlanUsage(
  companyId: string
): Promise<PlanUsage[]> {
  const [grouped, credits] = await Promise.all([
    prisma.jobPost.groupBy({
      by: ["listingPlan"],
      where: {
        companyId,
        status: JobPostStatus.ACTIVE,
      },
      _count: true,
    }),
    prisma.planCredit.findMany({
      where: { companyId },
      select: { plan: true, creditsPurchased: true },
    }),
  ]);

  const creditMap = new Map<ListingPlan, number>(
    credits.map((credit) => [credit.plan, credit.creditsPurchased])
  );

  return (Object.keys(planMetadata) as ListingPlanName[]).map((plan) => {
    const tier = planMetadata[plan];
    const used =
      grouped.find((item) => item.listingPlan === (plan as ListingPlan))?._count ?? 0;
    const purchased = creditMap.get(plan as ListingPlan) ?? 0;
    const limit = Math.max(purchased, used);
    const remaining = Math.max(limit - used, 0);

    return {
      plan,
      used,
      limit,
      remaining,
      bundleSize: tier.jobLimit,
      purchased,
    };
  });
}

export function resolveInitialPlan(
  usage: PlanUsage[],
  options: {
    lastUsed?: ListingPlan | null;
    defaultPlan?: ListingPlan | null;
  }
): { plan: ListingPlanName; reason: AutoSelectionReason } {
  const usageByPlan = new Map<ListingPlanName, PlanUsage>(
    usage.map((item) => [item.plan, item])
  );

  if (
    options.lastUsed &&
    usageByPlan.get(options.lastUsed as ListingPlanName)?.remaining !== undefined &&
    usageByPlan.get(options.lastUsed as ListingPlanName)!.remaining > 0
  ) {
    return { plan: options.lastUsed as ListingPlanName, reason: "lastUsed" };
  }

  if (
    options.defaultPlan &&
    usageByPlan.get(options.defaultPlan as ListingPlanName)?.remaining !== undefined &&
    usageByPlan.get(options.defaultPlan as ListingPlanName)!.remaining > 0
  ) {
    return { plan: options.defaultPlan as ListingPlanName, reason: "default" };
  }

  const fallbackPlan =
    usage.find((item) => item.remaining > 0)?.plan ||
    (options.lastUsed as ListingPlanName | undefined) ||
    (options.defaultPlan as ListingPlanName | undefined) ||
    (jobListingDurationPricing[0].name as ListingPlanName);

  const reason: AutoSelectionReason =
    fallbackPlan === options.lastUsed
      ? "lastUsed"
      : fallbackPlan === options.defaultPlan
        ? "default"
        : "fallback";

  return { plan: fallbackPlan, reason };
}

export function getPlanMetadata(plan: ListingPlanName) {
  return planMetadata[plan];
}