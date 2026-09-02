import { prisma } from "@/app/utils/db";
import { jobListingDurationPricing } from "@/app/utils/pricingTiers";
import { stripe } from "@/app/utils/stripe";
import {
  JobPostStatus,
  type ListingPlan,
  Prisma,
  StripeWebhookEventStatus,
} from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import Stripe from "stripe";
import { z } from "zod";
import { safeNotifyGoogleIndexingForJob } from "@/lib/google-indexing";
import { isJobPostPubliclyAvailable } from "@/app/utils/jobPublication";

const resend =
  process.env.RESEND_API_KEY !== undefined
    ? new Resend(process.env.RESEND_API_KEY)
    : undefined;

const jobIdSchema = z.string().uuid();

type CheckoutEmailJob = {
  jobTitle: string;
  listingPlan: ListingPlan;
  location: string;
};

type PublishedCheckoutJob = CheckoutEmailJob & {
  slug: string;
  transitionedToActive: boolean;
  publiclyAvailable: boolean;
};

function successfulResponse() {
  return new Response(null, { status: 200 });
}

async function sendCheckoutEmails(
  session: Stripe.Checkout.Session,
  job: CheckoutEmailJob
) {
  const customerEmail = session.customer_details?.email ?? undefined;

  if (!customerEmail || !resend) {
    return;
  }

  let invoiceUrl: string | undefined;
  try {
    const invoiceId =
      typeof session.invoice === "string"
        ? session.invoice
        : session.invoice?.id;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (invoiceId) {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      invoiceUrl =
        invoice.hosted_invoice_url || invoice.invoice_pdf || undefined;
    } else if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: ["latest_charge"] }
      );
      const latestCharge = paymentIntent.latest_charge;

      if (latestCharge && typeof latestCharge !== "string") {
        invoiceUrl = latestCharge.receipt_url || undefined;
      }
    }
  } catch {
    console.error("Stripe invoice details retrieval failed.");
  }

  let plan = "";
  let price = "";
  let duration = "";
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
      expand: ["data.price.product", "data.price.recurring"],
    });
    const priceObject = lineItems.data[0]?.price;

    if (priceObject) {
      const product = priceObject.product;
      plan =
        product && typeof product !== "string" && !product.deleted
          ? product.name
          : "";
      price = priceObject.unit_amount
        ? (priceObject.unit_amount / 100).toFixed(2)
        : "";
      duration = priceObject.recurring?.interval ?? "";
    }
  } catch {
    console.error("Stripe checkout details retrieval failed.");
  }

  try {
    await resend.emails.send({
      from: "JobVert <contact@jobvert.fr>",
      to: [customerEmail],
      subject: "Confirmation d'abonnement",
      html: `
        <p>Merci pour votre achat.</p>
        <p>Plan : ${plan}</p>
        <p>Prix : ${price}</p>
        <p>Durée : ${duration}</p>
        ${invoiceUrl ? `<p><a href="${invoiceUrl}">Voir votre facture</a></p>` : ""}
      `,
    });
  } catch {
    console.error("Stripe confirmation email delivery failed.");
  }

  try {
    await resend.emails.send({
      from: "JobVert <contact@jobvert.fr>",
      to: [customerEmail],
      subject: "Votre offre d'emploi est en ligne",
      html: `
        <p>Bonjour,</p>
        <p>Votre offre <strong>${job.jobTitle}</strong> est désormais publiée.</p>
        <p>Plan sélectionné : ${job.listingPlan}</p>
        ${job.location ? `<p>Lieu : ${job.location}</p>` : ""}
        <p>Merci d'utiliser JobVert pour vos recrutements.</p>
      `,
    });
  } catch {
    console.error("Job publication email delivery failed.");
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return new Response("Webhook error", { status: 400 });
  }

  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured.");
    return new Response("Webhook unavailable", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Webhook error", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return successfulResponse();
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const parsedJobId = jobIdSchema.safeParse(session.metadata?.jobId);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  let outcome:
    | { kind: "processed"; job: PublishedCheckoutJob }
    | { kind: "ignored_invalid_metadata" }
    | { kind: "ignored_resource_missing" };

  try {
    outcome = await prisma.$transaction(async (tx) => {
      const hasValidContext = parsedJobId.success && Boolean(customerId);

      await tx.stripeWebhookEvent.create({
        data: {
          id: event.id,
          eventType: event.type,
          status: hasValidContext
            ? StripeWebhookEventStatus.PROCESSED
            : StripeWebhookEventStatus.IGNORED_INVALID_METADATA,
        },
      });

      if (!parsedJobId.success || !customerId) {
        return { kind: "ignored_invalid_metadata" } as const;
      }

      const user = await tx.user.findUnique({
        where: {
          stripeCustomerId: customerId,
        },
        select: {
          Company: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user?.Company) {
        await tx.stripeWebhookEvent.update({
          where: { id: event.id },
          data: {
            status: StripeWebhookEventStatus.IGNORED_RESOURCE_MISSING,
          },
        });
        return { kind: "ignored_resource_missing" } as const;
      }

      const job = await tx.jobPost.findUnique({
        where: {
          id: parsedJobId.data,
        },
        select: {
          companyId: true,
          listingPlan: true,
          jobTitle: true,
          location: true,
          slug: true,
          status: true,
          createdAt: true,
          validThrough: true,
        },
      });

      if (!job) {
        await tx.stripeWebhookEvent.update({
          where: { id: event.id },
          data: {
            status: StripeWebhookEventStatus.IGNORED_RESOURCE_MISSING,
          },
        });
        return { kind: "ignored_resource_missing" } as const;
      }

      if (job.companyId !== user.Company.id) {
        await tx.stripeWebhookEvent.update({
          where: { id: event.id },
          data: {
            status: StripeWebhookEventStatus.IGNORED_INVALID_METADATA,
          },
        });
        return { kind: "ignored_invalid_metadata" } as const;
      }

      const tier = jobListingDurationPricing.find(
        (pricing) => pricing.name === job.listingPlan
      );

      if (!tier) {
        throw new Error("Listing plan configuration not found");
      }

      await tx.planCredit.upsert({
        where: {
          companyId_plan: {
            companyId: job.companyId,
            plan: job.listingPlan,
          },
        },
        update: {
          creditsPurchased: {
            increment: tier.jobLimit,
          },
        },
        create: {
          companyId: job.companyId,
          plan: job.listingPlan,
          creditsPurchased: tier.jobLimit,
        },
      });

      await tx.jobPost.update({
        where: {
          id: parsedJobId.data,
          companyId: user.Company.id,
        },
        data: {
          status: JobPostStatus.ACTIVE,
        },
      });

      return {
        kind: "processed",
        job: {
          jobTitle: job.jobTitle,
          listingPlan: job.listingPlan,
          location: job.location,
          slug: job.slug,
          transitionedToActive: job.status !== JobPostStatus.ACTIVE,
          publiclyAvailable: isJobPostPubliclyAvailable({
            status: JobPostStatus.ACTIVE,
            createdAt: job.createdAt,
            validThrough: job.validThrough,
            listingPlan: job.listingPlan,
          }),
        },
      } as const;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
        const existingEvent = await prisma.stripeWebhookEvent.findUnique({
          where: { id: event.id },
          select: { id: true },
        });

        if (existingEvent) {
          return successfulResponse();
        }
      } catch {
        console.error("Stripe webhook idempotency check failed.");
        return new Response("Webhook processing failed", { status: 500 });
      }
    }

    console.error("Stripe webhook database processing failed.");
    return new Response("Webhook processing failed", { status: 500 });
  }

  if (outcome.kind === "ignored_resource_missing") {
    console.warn("Stripe webhook ignored because a JobVert resource is missing.");
    return successfulResponse();
  }

  if (outcome.kind === "ignored_invalid_metadata") {
    console.warn("Stripe webhook ignored because its metadata is invalid.");
    return successfulResponse();
  }

  if (
    outcome.job.transitionedToActive &&
    outcome.job.publiclyAvailable
  ) {
    revalidatePath(`/job/${outcome.job.slug}`);
    await safeNotifyGoogleIndexingForJob(
      outcome.job.slug,
      "URL_UPDATED"
    );
  }

  await sendCheckoutEmails(session, outcome.job);

  return successfulResponse();
}
