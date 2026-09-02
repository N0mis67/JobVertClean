import { JobPostStatus, type ListingPlan } from "@prisma/client";

import { planDuration } from "./pricingTiers.ts";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type PublicJobPostState = {
  status: JobPostStatus;
  createdAt: Date;
  validThrough: Date | null;
  listingPlan: ListingPlan;
};

export function getJobPostPublicExpirationDate(
  job: Pick<PublicJobPostState, "createdAt" | "validThrough" | "listingPlan">
): Date | null {
  const durationDays = planDuration[job.listingPlan];

  if (!durationDays) {
    return null;
  }

  const planExpiration = new Date(
    job.createdAt.getTime() + durationDays * DAY_IN_MILLISECONDS
  );

  if (job.validThrough && job.validThrough < planExpiration) {
    return job.validThrough;
  }

  return planExpiration;
}

export function isJobPostPubliclyAvailable(
  job: PublicJobPostState,
  now = new Date()
): boolean {
  if (job.status !== JobPostStatus.ACTIVE) {
    return false;
  }

  const expirationDate = getJobPostPublicExpirationDate(job);

  return expirationDate !== null && expirationDate >= now;
}
