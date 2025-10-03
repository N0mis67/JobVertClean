export type ListingPlanName = "Bonsai" | "Arbuste" | "Forêt";

export type PlanUsage = {
  plan: ListingPlanName;
  used: number;
  limit: number;
  remaining: number;
  bundleSize: number;
  purchased: number;
};

export type AutoSelectionReason = "lastUsed" | "default" | "fallback";