import "server-only";

import { StripeCustomerCleanupStatus } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "./db";
import { stripe } from "./stripe";

export const STRIPE_CLEANUP_BATCH_SIZE = 25;
export const STRIPE_CLEANUP_LOCK_TIMEOUT_MINUTES = 30;

const MAX_RETRY_DELAY_HOURS = 24;

function isStripeResourceMissing(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

function retryDelayHours(attempts: number) {
  return Math.min(2 ** Math.max(attempts - 1, 0), MAX_RETRY_DELAY_HOURS);
}

async function expireCheckoutSession({
  cleanupJobId,
  attemptNumber,
  sessionId,
}: {
  cleanupJobId: string;
  attemptNumber: number;
  sessionId: string;
}) {
  try {
    await stripe.checkout.sessions.expire(
      sessionId,
      {},
      {
        idempotencyKey: `cleanup:${cleanupJobId}:${attemptNumber}:expire:${sessionId}`,
      }
    );
  } catch (expirationError) {
    if (isStripeResourceMissing(expirationError)) {
      return;
    }

    try {
      const currentSession = await stripe.checkout.sessions.retrieve(sessionId);

      if (
        currentSession.status === "complete" ||
        currentSession.status === "expired"
      ) {
        return;
      }
    } catch (retrievalError) {
      if (isStripeResourceMissing(retrievalError)) {
        return;
      }

      throw retrievalError;
    }

    throw expirationError;
  }
}

async function deleteStripeCustomer({
  cleanupJobId,
  attemptNumber,
  stripeCustomerId,
}: {
  cleanupJobId: string;
  attemptNumber: number;
  stripeCustomerId: string;
}) {
  try {
    await stripe.customers.del(
      stripeCustomerId,
      {},
      {
        idempotencyKey: `cleanup:${cleanupJobId}:${attemptNumber}:customer`,
      }
    );
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      return;
    }

    throw error;
  }
}

async function cleanupStripeCustomer({
  cleanupJobId,
  attemptNumber,
  stripeCustomerId,
}: {
  cleanupJobId: string;
  attemptNumber: number;
  stripeCustomerId: string;
}) {
  try {
    const openSessions = stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      status: "open",
      limit: 100,
    });

    await openSessions.autoPagingEach(async (session) => {
      await expireCheckoutSession({
        cleanupJobId,
        attemptNumber,
        sessionId: session.id,
      });
    });

    const remainingOpenSessions = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      status: "open",
      limit: 1,
    });

    if (remainingOpenSessions.data.length > 0) {
      throw new Error("Open Stripe Checkout Sessions remain");
    }
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      return;
    }

    throw error;
  }

  await deleteStripeCustomer({
    cleanupJobId,
    attemptNumber,
    stripeCustomerId,
  });
}

export async function cleanupPendingStripeCustomers() {
  const now = new Date();
  const staleLockCutoff = new Date(
    now.getTime() - STRIPE_CLEANUP_LOCK_TIMEOUT_MINUTES * 60 * 1000
  );

  await prisma.stripeCustomerCleanupJob.updateMany({
    where: {
      status: StripeCustomerCleanupStatus.PROCESSING,
      lockedAt: {
        lt: staleLockCutoff,
      },
    },
    data: {
      status: StripeCustomerCleanupStatus.PENDING,
      lockedAt: null,
      nextAttemptAt: now,
    },
  });

  const jobs = await prisma.stripeCustomerCleanupJob.findMany({
    where: {
      status: StripeCustomerCleanupStatus.PENDING,
      nextAttemptAt: {
        lte: now,
      },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: STRIPE_CLEANUP_BATCH_SIZE,
    select: {
      id: true,
      stripeCustomerId: true,
      attempts: true,
    },
  });

  const result = {
    examined: jobs.length,
    completed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    const lockedAt = new Date();
    const claim = await prisma.stripeCustomerCleanupJob.updateMany({
      where: {
        id: job.id,
        status: StripeCustomerCleanupStatus.PENDING,
        nextAttemptAt: {
          lte: now,
        },
        lockedAt: null,
      },
      data: {
        status: StripeCustomerCleanupStatus.PROCESSING,
        lockedAt,
      },
    });

    if (claim.count !== 1) {
      result.skipped += 1;
      continue;
    }

    const attemptNumber = job.attempts + 1;

    try {
      await cleanupStripeCustomer({
        cleanupJobId: job.id,
        attemptNumber,
        stripeCustomerId: job.stripeCustomerId,
      });

      const deleted = await prisma.stripeCustomerCleanupJob.deleteMany({
        where: {
          id: job.id,
          status: StripeCustomerCleanupStatus.PROCESSING,
          lockedAt,
        },
      });

      if (deleted.count === 1) {
        result.completed += 1;
      } else {
        result.skipped += 1;
      }
    } catch {
      console.error("Stripe customer cleanup task failed.");

      const delayHours = retryDelayHours(attemptNumber);
      const nextAttemptAt = new Date(
        Date.now() + delayHours * 60 * 60 * 1000
      );

      try {
        await prisma.stripeCustomerCleanupJob.updateMany({
          where: {
            id: job.id,
            status: StripeCustomerCleanupStatus.PROCESSING,
            lockedAt,
          },
          data: {
            status: StripeCustomerCleanupStatus.PENDING,
            attempts: {
              increment: 1,
            },
            nextAttemptAt,
            lockedAt: null,
          },
        });
      } catch {
        console.error("Stripe cleanup retry scheduling failed.");
      }

      result.failed += 1;
    }
  }

  return result;
}
