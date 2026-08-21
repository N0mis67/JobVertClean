import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/utils/db";
import { JobPostStatus } from "@prisma/client";
import { generateUniqueJobSlug } from "@/app/utils/jobSlug";

const importedJobSchema = z.object({
  externalId: z.string().min(1),
  externalUrl: z.string().url().optional(),
  title: z.string().min(2),
  companyName: z.string().optional(),
  companyWebsite: z.string().url().optional(),
  location: z.string().min(1),
  employmentType: z.string().min(1),
  description: z.string().min(1),
  salaryFrom: z.number().optional(),
  salaryTo: z.number().optional(),
  publishedAt: z.string().datetime().optional(),
  validThrough: z.string().datetime().nullable().optional(),
  score: z.number().min(0).max(100),
  scoreReasons: z.array(z.string()).optional(),
  rawPayload: z.unknown().optional(),
});

const importPayloadSchema = z.object({
  source: z.literal("FRANCE_TRAVAIL"),
  dryRun: z.boolean().default(true),
  jobs: z.array(importedJobSchema).min(1).max(100),
});

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.JOBVERT_IMPORT_API_SECRET;
  const importCompanyId = process.env.JOBVERT_IMPORT_COMPANY_ID;

  if (!expectedSecret) {
    return NextResponse.json(
      { success: false, error: "Missing server import secret" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!importCompanyId) {
    return NextResponse.json(
      { success: false, error: "Missing JOBVERT_IMPORT_COMPANY_ID" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const parsed = importPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { source, dryRun, jobs } = parsed.data;

  if (dryRun) {
    return NextResponse.json({
      success: true,
      message: "Payload valid — dry run only",
      source,
      dryRun,
      receivedCount: jobs.length,
      createdCount: 0,
      skippedCount: 0,
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const job of jobs) {
    const existingJob = await prisma.jobPost.findUnique({
      where: {
        externalId: job.externalId,
      },
      select: {
        id: true,
      },
    });

    if (existingJob) {
      skippedCount++;
      continue;
    }

    const slug = await generateUniqueJobSlug(prisma, {
      title: job.title,
      city: job.location,
    });

    await prisma.jobPost.create({
      data: {
        companyId: importCompanyId,
        slug,
        jobTitle: job.title,
        employmentType: job.employmentType,
        location: job.location,
        salaryFrom: job.salaryFrom ?? 0,
        salaryTo: job.salaryTo ?? 0,
        jobDescription: job.description,
        listingPlan: "Bonsai",
        benefits: ["Offre issue de France Travail"],
        status: JobPostStatus.DRAFT,
        validThrough: job.validThrough ? new Date(job.validThrough) : null,

        externalSource: source,
        externalId: job.externalId,
        externalUrl: job.externalUrl,
        importedAt: new Date(),
        rawPayload: job.rawPayload ?? {},
        importScore: job.score,
        importScoreReasons: job.scoreReasons?.join(" | ") ?? null,
      },
    });

    createdCount++;
  }

  return NextResponse.json({
    success: true,
    message: "Import completed",
    source,
    dryRun,
    receivedCount: jobs.length,
    createdCount,
    skippedCount,
  });
}