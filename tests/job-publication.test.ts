import assert from "node:assert/strict";
import test from "node:test";

import { JobPostStatus } from "@prisma/client";

import {
  getJobPostPublicExpirationDate,
  isJobPostPubliclyAvailable,
  type PublicJobPostState,
} from "../app/utils/jobPublication.ts";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-10T12:00:00.000Z");

function daysFromNow(days: number): Date {
  return new Date(now.getTime() + days * DAY_IN_MILLISECONDS);
}

function createJob(
  overrides: Partial<PublicJobPostState>
): PublicJobPostState {
  return {
    status: JobPostStatus.ACTIVE,
    createdAt: now,
    validThrough: null,
    listingPlan: "Bonsai",
    externalSource: null,
    ...overrides,
  };
}

test("keeps a 45-day-old active France Travail job public without validThrough", () => {
  const job = createJob({
    createdAt: daysFromNow(-45),
    externalSource: "FRANCE_TRAVAIL",
  });

  assert.equal(getJobPostPublicExpirationDate(job), null);
  assert.equal(isJobPostPubliclyAvailable(job, now), true);
});

test("keeps an active France Travail job public before validThrough", () => {
  const job = createJob({
    createdAt: daysFromNow(-45),
    validThrough: daysFromNow(5),
    externalSource: "FRANCE_TRAVAIL",
  });

  assert.equal(isJobPostPubliclyAvailable(job, now), true);
});

test("expires an active France Travail job after validThrough", () => {
  const job = createJob({
    createdAt: daysFromNow(-45),
    validThrough: daysFromNow(-1),
    externalSource: "FRANCE_TRAVAIL",
  });

  assert.equal(isJobPostPubliclyAvailable(job, now), false);
});

test("keeps a 20-day-old JobVert Bonsai job public without validThrough", () => {
  const job = createJob({ createdAt: daysFromNow(-20) });

  assert.equal(isJobPostPubliclyAvailable(job, now), true);
});

test("expires a 40-day-old JobVert Bonsai job without validThrough", () => {
  const job = createJob({ createdAt: daysFromNow(-40) });

  assert.equal(isJobPostPubliclyAvailable(job, now), false);
});
