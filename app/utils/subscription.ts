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
  const grouped = await prisma.jobPost.groupBy({
    by: ["listingPlan"],
    where: {
      companyId,
      status: JobPostStatus.ACTIVE,
    },
    _count: true,
  });

  return (Object.keys(planMetadata) as ListingPlanName[]).map((plan) => {
    const tier = planMetadata[plan];
    const count =
      grouped.find((item) => item.listingPlan === (plan as ListingPlan))?._count ?? 0;
    return {
      plan,
      used: count,
      limit: tier.jobLimit,
      remaining: Math.max(tier.jobLimit - count, 0),
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