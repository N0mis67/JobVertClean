import {
  FRANCE_TRAVAIL_SOURCE,
  getFranceTravailJobUrl,
} from "./france-travail.ts";

export type FranceTravailBackfillCandidate = {
  id: string;
  externalSource: string | null;
  externalId: string | null;
  externalUrl: string | null;
};

export type FranceTravailBackfillPlan = {
  updates: Array<{
    id: string;
    externalId: string;
    externalUrl: string;
  }>;
  unchangedIds: string[];
  invalidIds: string[];
  ignoredIds: string[];
};

export function planFranceTravailUrlBackfill(
  candidates: FranceTravailBackfillCandidate[]
): FranceTravailBackfillPlan {
  const plan: FranceTravailBackfillPlan = {
    updates: [],
    unchangedIds: [],
    invalidIds: [],
    ignoredIds: [],
  };

  for (const candidate of candidates) {
    if (candidate.externalSource !== FRANCE_TRAVAIL_SOURCE) {
      plan.ignoredIds.push(candidate.id);
      continue;
    }

    const canonicalUrl = getFranceTravailJobUrl(candidate.externalId);

    if (!canonicalUrl || !candidate.externalId) {
      plan.invalidIds.push(candidate.id);
      continue;
    }

    if (candidate.externalUrl === canonicalUrl) {
      plan.unchangedIds.push(candidate.id);
      continue;
    }

    plan.updates.push({
      id: candidate.id,
      externalId: candidate.externalId,
      externalUrl: canonicalUrl,
    });
  }

  return plan;
}
