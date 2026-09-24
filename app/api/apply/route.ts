import { StoredFileKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/utils/auth";
import { prisma } from "@/app/utils/db";
import { emailFromAddress, ensureResendClient } from "@/app/utils/email";
import { FRANCE_TRAVAIL_SOURCE } from "@/lib/france-travail";
import {
  ApplicationSubmissionError,
  submitInternalApplication,
  type ApplicationJob,
  type ApplicationSubmission,
} from "./application-service";

const applicationSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(1).max(50),
  coverLetter: z.string().trim().min(10).max(10_000),
  resume: z.string().url().max(2_048),
  jobId: z.string().trim().min(1).max(100),
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };

    return entities[character] ?? character;
  });
}

async function sendRecruiterEmail(
  job: ApplicationJob,
  application: ApplicationSubmission
) {
  if (!job.recruiterEmail) {
    throw new Error("Recruiter email is unavailable.");
  }

  const resend = ensureResendClient();
  const candidateName = `${application.firstName} ${application.lastName}`;
  const safeCandidateName = escapeHtml(candidateName);
  const safeJobTitle = escapeHtml(job.jobTitle);
  const safeCompanyName = escapeHtml(job.companyName);
  const safeEmail = escapeHtml(application.email);
  const safePhone = escapeHtml(application.phone);
  const safeCoverLetter = escapeHtml(application.coverLetter).replace(
    /\r?\n/g,
    "<br />"
  );
  const attachmentName = `CV-${candidateName.replace(/[^a-z0-9-]+/gi, "-")}.pdf`;

  const { error } = await resend.emails.send({
    from: emailFromAddress,
    to: job.recruiterEmail,
    replyTo: application.email,
    subject: `Nouvelle candidature JobVert — ${job.jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 20px;">Nouvelle candidature pour ${safeJobTitle}</h1>
        <p>${safeCandidateName} a candidaté auprès de ${safeCompanyName} depuis JobVert.</p>
        <p><strong>Email :</strong> ${safeEmail}<br /><strong>Téléphone :</strong> ${safePhone}</p>
        <h2 style="font-size: 16px;">Lettre de motivation</h2>
        <p>${safeCoverLetter}</p>
        <p>Le CV du candidat est joint à cet email.</p>
      </div>
    `,
    text: [
      `Nouvelle candidature pour ${job.jobTitle}`,
      `${candidateName} a candidaté auprès de ${job.companyName} depuis JobVert.`,
      `Email : ${application.email}`,
      `Téléphone : ${application.phone}`,
      "",
      "Lettre de motivation :",
      application.coverLetter,
      "",
      "Le CV du candidat est joint à cet email.",
    ].join("\n"),
    attachments: [
      {
        path: application.resume,
        filename: attachmentName,
        contentType: "application/pdf",
      },
    ],
  });

  if (error) {
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const parsed = applicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid application payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    await submitInternalApplication(parsed.data, session.user.id, {
      async findJob(jobId) {
        const job = await prisma.jobPost.findFirst({
          where: {
            id: jobId,
            status: "ACTIVE",
          },
          select: {
            id: true,
            jobTitle: true,
            externalSource: true,
            company: {
              select: {
                name: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        });

        if (!job) {
          return null;
        }

        return {
          id: job.id,
          jobTitle: job.jobTitle,
          externalSource: job.externalSource,
          recruiterEmail: job.company.user.email,
          companyName: job.company.name,
        };
      },
      async findOwnedResume(userId, resumeUrl) {
        const resume = await prisma.storedFile.findFirst({
          where: {
            userId,
            url: resumeUrl,
            provider: "uploadthing",
            kind: StoredFileKind.JOB_SEEKER_RESUME,
          },
          select: {
            id: true,
          },
        });

        return resume !== null;
      },
      sendRecruiterEmail,
      async incrementApplications(jobId) {
        const result = await prisma.jobPost.updateMany({
          where: {
            id: jobId,
            status: "ACTIVE",
            OR: [
              { externalSource: null },
              { externalSource: { not: FRANCE_TRAVAIL_SOURCE } },
            ],
          },
          data: {
            applications: {
              increment: 1,
            },
          },
        });

        if (result.count !== 1) {
          throw new ApplicationSubmissionError(
            "Cette offre ne peut pas recevoir de candidature interne.",
            409,
            "INTERNAL_APPLICATION_DISABLED"
          );
        }
      },
      async markResumeAttached(userId, resumeUrl) {
        await prisma.storedFile.updateMany({
          where: {
            userId,
            url: resumeUrl,
            provider: "uploadthing",
            kind: StoredFileKind.JOB_SEEKER_RESUME,
          },
          data: {
            attachedAt: new Date(),
          },
        });
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApplicationSubmissionError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error("Application submission failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "La candidature n'a pas pu être envoyée.",
      },
      { status: 500 }
    );
  }
}

