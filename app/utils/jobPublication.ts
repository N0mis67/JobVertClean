import { JobPostStatus, type ListingPlan } from "@prisma/client";

import { FRANCE_TRAVAIL_SOURCE } from "../../lib/france-travail.ts";
import { planDuration } from "./pricingTiers.ts";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type PublicJobPostState = {
  status: JobPostStatus;
  createdAt: Date;
  validThrough: Date | null;
  listingPlan: ListingPlan;
  externalSource: string | null;
};

export function getJobPostPublicExpirationDate(
  job: Pick<
    PublicJobPostState,
    "createdAt" | "validThrough" | "listingPlan" | "externalSource"
  >
): Date | null {
  if (job.validThrough) {
    return job.validThrough;
  }

  if (job.externalSource === FRANCE_TRAVAIL_SOURCE) {
    return null;
  }

  const durationDays = planDuration[job.listingPlan];

  if (!durationDays) {
    return null;
  }

  return new Date(
    job.createdAt.getTime() + durationDays * DAY_IN_MILLISECONDS
  );
}

export function isJobPostPubliclyAvailable(
  job: PublicJobPostState,
  now = new Date()
): boolean {
  if (job.status !== JobPostStatus.ACTIVE) {
    return false;
  }

  const expirationDate = getJobPostPublicExpirationDate(job);

  if (expirationDate === null) {
    return (
      job.externalSource === FRANCE_TRAVAIL_SOURCE &&
      job.validThrough === null
    );
  }

  return expirationDate >= now;
}
