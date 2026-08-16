import { NextResponse } from "next/server";
import { z } from "zod";

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

  return NextResponse.json({
    success: true,
    message: "Payload valid",
    source: parsed.data.source,
    dryRun: parsed.data.dryRun,
    receivedCount: parsed.data.jobs.length,
  });
}