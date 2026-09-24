import { PrismaClient } from "@prisma/client";

import { FRANCE_TRAVAIL_SOURCE } from "../lib/france-travail.ts";
import { planFranceTravailUrlBackfill } from "../lib/france-travail-backfill.ts";

type BackfillOptions = {
  dryRun: boolean;
  limit?: number;
};

function parseOptions(argumentsList: string[]): BackfillOptions {
  let dryRun = false;
  let all = false;
  let limit: number | undefined;

  for (const argument of argumentsList) {
    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument === "--all") {
      all = true;
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

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (all && limit !== undefined) {
    throw new Error("Use either --all or --limit=N, not both.");
  }

  if (!dryRun && !all && limit === undefined) {
    throw new Error(
      "A real backfill requires --all or --limit=N. Use --dry-run to preview all eligible rows."
    );
  }

  return { dryRun, limit };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const candidates = await prisma.jobPost.findMany({
      where: {
        externalSource: FRANCE_TRAVAIL_SOURCE,
        externalId: { not: null },
      },
      select: {
        id: true,
        externalSource: true,
        externalId: true,
        externalUrl: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      ...(options.limit ? { take: options.limit } : {}),
    });

    const plan = planFranceTravailUrlBackfill(candidates);
    let updatedCount = 0;

    if (!options.dryRun) {
      for (const update of plan.updates) {
        const result = await prisma.jobPost.updateMany({
          where: {
            id: update.id,
            externalSource: FRANCE_TRAVAIL_SOURCE,
            externalId: update.externalId,
          },
          data: {
            externalUrl: update.externalUrl,
          },
        });

        updatedCount += result.count;
      }
    }

    console.log("France Travail URL backfill summary", {
      examined: candidates.length,
      eligibleForUpdate: plan.updates.length,
      updated: updatedCount,
      unchanged: plan.unchangedIds.length,
      invalidExternalIds: plan.invalidIds.length,
      dryRun: options.dryRun,
    });

    if (plan.invalidIds.length > 0) {
      const invalidCandidates = candidates
        .filter((candidate) => plan.invalidIds.includes(candidate.id))
        .map((candidate) => ({
          id: candidate.id,
          externalId: candidate.externalId,
        }));

      console.warn(
        "Rows skipped because their externalId is invalid:",
        invalidCandidates
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    `France Travail URL backfill failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`
  );
  process.exitCode = 1;
});
