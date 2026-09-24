import assert from "node:assert/strict";
import test from "node:test";

import {
  ApplicationSubmissionError,
  submitInternalApplication,
  type ApplicationDependencies,
  type ApplicationJob,
  type ApplicationSubmission,
} from "../app/api/apply/application-service.ts";

const application: ApplicationSubmission = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "0102030405",
  coverLetter: "Une lettre suffisamment longue.",
  resume: "https://utfs.io/f/example.pdf",
  jobId: "job-1",
};

function createDependencies(job: ApplicationJob) {
  const calls = {
    resumeChecks: 0,
    emails: 0,
    increments: 0,
    attachments: 0,
  };

  const dependencies: ApplicationDependencies = {
    async findJob() {
      return job;
    },
    async findOwnedResume() {
      calls.resumeChecks += 1;
      return true;
    },
    async sendRecruiterEmail() {
      calls.emails += 1;
    },
    async incrementApplications() {
      calls.increments += 1;
    },
    async markResumeAttached() {
      calls.attachments += 1;
    },
  };

  return { calls, dependencies };
}

test("rejects France Travail applications before any email or mutation", async () => {
  const { calls, dependencies } = createDependencies({
    id: "job-1",
    jobTitle: "Paysagiste",
    externalSource: "FRANCE_TRAVAIL",
    recruiterEmail: "admin@jobvert.fr",
    companyName: "JobVert",
  });

  await assert.rejects(
    submitInternalApplication(application, "user-1", dependencies),
    (error: unknown) =>
      error instanceof ApplicationSubmissionError &&
      error.code === "EXTERNAL_APPLICATION_REQUIRED" &&
      error.status === 409
  );
  assert.deepEqual(calls, {
    resumeChecks: 0,
    emails: 0,
    increments: 0,
    attachments: 0,
  });
});

test("keeps the complete internal workflow for a native Jobvert job", async () => {
  const { calls, dependencies } = createDependencies({
    id: "job-1",
    jobTitle: "Paysagiste",
    externalSource: null,
    recruiterEmail: "recruteur@example.com",
    companyName: "Paysages SARL",
  });

  await submitInternalApplication(application, "user-1", dependencies);

  assert.deepEqual(calls, {
    resumeChecks: 1,
    emails: 1,
    increments: 1,
    attachments: 1,
  });
});

