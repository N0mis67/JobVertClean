import { FRANCE_TRAVAIL_SOURCE } from "../../../lib/france-travail.ts";

export type ApplicationSubmission = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coverLetter: string;
  resume: string;
  jobId: string;
};

export type ApplicationJob = {
  id: string;
  jobTitle: string;
  externalSource: string | null;
  recruiterEmail: string | null;
  companyName: string;
};

export type ApplicationDependencies = {
  findJob: (jobId: string) => Promise<ApplicationJob | null>;
  findOwnedResume: (userId: string, resumeUrl: string) => Promise<boolean>;
  sendRecruiterEmail: (
    job: ApplicationJob,
    application: ApplicationSubmission
  ) => Promise<void>;
  incrementApplications: (jobId: string) => Promise<void>;
  markResumeAttached: (userId: string, resumeUrl: string) => Promise<void>;
};

export class ApplicationSubmissionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status: number,
    code: string
  ) {
    super(message);
    this.name = "ApplicationSubmissionError";
    this.status = status;
    this.code = code;
  }
}

export async function submitInternalApplication(
  application: ApplicationSubmission,
  userId: string,
  dependencies: ApplicationDependencies
): Promise<void> {
  const job = await dependencies.findJob(application.jobId);

  if (!job) {
    throw new ApplicationSubmissionError(
      "Cette offre est introuvable ou n'est plus disponible.",
      404,
      "JOB_NOT_FOUND"
    );
  }

  if (job.externalSource === FRANCE_TRAVAIL_SOURCE) {
    throw new ApplicationSubmissionError(
      "Cette offre France Travail accepte les candidatures uniquement sur France Travail.",
      409,
      "EXTERNAL_APPLICATION_REQUIRED"
    );
  }

  if (!job.recruiterEmail) {
    throw new ApplicationSubmissionError(
      "Le recruteur ne peut pas recevoir de candidature pour le moment.",
      422,
      "RECRUITER_EMAIL_UNAVAILABLE"
    );
  }

  const ownsResume = await dependencies.findOwnedResume(
    userId,
    application.resume
  );

  if (!ownsResume) {
    throw new ApplicationSubmissionError(
      "Le CV fourni est invalide.",
      400,
      "INVALID_RESUME"
    );
  }

  await dependencies.sendRecruiterEmail(job, application);
  await dependencies.incrementApplications(job.id);
  await dependencies.markResumeAttached(userId, application.resume);
}
