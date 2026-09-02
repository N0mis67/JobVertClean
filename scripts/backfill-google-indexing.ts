import { JobPostStatus, PrismaClient } from "@prisma/client";

import { isJobPostPubliclyAvailable } from "../app/utils/jobPublication.ts";
import {
  getJobUrl,
  safeNotifyGoogleIndexing,
} from "../lib/google-indexing.ts";

const DEFAULT_DELAY_MS = 300;

type BackfillOptions = {
  all: boolean;
  delayMs: number;
  dryRun: boolean;
  limit?: number;
};

function parseOptions(argumentsList: string[]): BackfillOptions {
  let all = false;
  let dryRun = false;
  let limit: number | undefined;
  let delayMs = DEFAULT_DELAY_MS;

  for (const argument of argumentsList) {
    if (argument === "--all") {
      all = true;
      continue;
    }

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument.startsWith("--limit=")) {
      const parsedLimit = Number(argument.slice("--limit=".length));

      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        throw new Error("--limit must be a positive integer.");
      }

      limit = parsedLimit;
      continue;
    }

    if (argument.startsWith("--delay-ms=")) {
      const parsedDelay = Number(argument.slice("--delay-ms=".length));

      if (!Number.isInteger(parsedDelay) || parsedDelay < 0) {
        throw new Error("--delay-ms must be a non-negative integer.");
      }

      delayMs = parsedDelay;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (all && limit !== undefined) {
    throw new Error("Use either --all or --limit=N, not both.");
  }

  if (!dryRun && !all && limit === undefined) {
    throw new Error(
      "A real backfill requires --limit=N or the explicit --all flag. Use --dry-run to preview all eligible URLs safely."
    );
  }

  return { all, delayMs, dryRun, limit };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const options = parseOptions(process.argv.slice(2));

  if (
    !options.dryRun &&
    process.env.GOOGLE_INDEXING_ENABLED !== "true"
  ) {
    throw new Error(
      "A real backfill requires GOOGLE_INDEXING_ENABLED=true. No Google request was sent."
    );
  }

  const prisma = new PrismaClient();

  try {
    const now = new Date();
    const candidates = await prisma.jobPost.findMany({
      where: {
        status: JobPostStatus.ACTIVE,
        OR: [{ validThrough: null }, { validThrough: { gt: now } }],
      },
      select: {
        slug: true,
        status: true,
        createdAt: true,
        validThrough: true,
        listingPlan: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const eligibleJobs = candidates.filter((job) =>
      isJobPostPubliclyAvailable(job, now)
    );
    const selectedJobs = options.limit
      ? eligibleJobs.slice(0, options.limit)
      : eligibleJobs;
    let successCount = 0;
    let failureCount = 0;
    let ignoredCount = eligibleJobs.length - selectedJobs.length;

    for (let index = 0; index < selectedJobs.length; index += 1) {
      const job = selectedJobs[index];

      try {
        const url = getJobUrl(job.slug);

        if (options.dryRun) {
          console.log(`[dry-run] ${url}`);
          ignoredCount += 1;
          continue;
        }

        const result = await safeNotifyGoogleIndexing(url, "URL_UPDATED");

        if (result) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
      } catch (error) {
        failureCount += 1;
        console.error(
          `[Google Indexing] Backfill failed for slug ${job.slug}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      const hasAnotherNotification = index < selectedJobs.length - 1;

      if (hasAnotherNotification && options.delayMs > 0) {
        await delay(options.delayMs);
      }
    }

    console.log("Google Indexing backfill summary", {
      totalFound: eligibleJobs.length,
      success: successCount,
      failures: failureCount,
      ignored: ignoredCount,
      dryRun: options.dryRun,
      delayMs: options.delayMs,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    `Google Indexing backfill failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`
  );
  process.exitCode = 1;
});
