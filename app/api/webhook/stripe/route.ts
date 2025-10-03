import { prisma } from "@/app/utils/db";
import { stripe } from "@/app/utils/stripe";
import { JobPostStatus } from "@prisma/client";
import { jobListingDurationPricing } from "@/app/utils/pricingTiers";
import { headers } from "next/headers";
import Stripe from "stripe";
import { Resend } from "resend";


export async function POST(req: Request) {
  const body = await req.text();

  const headersList = await headers();

  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch {
    return new Response("Webhook error", { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const customerId = session.customer as string;
    const jobId = session.metadata?.jobId;

    if (!jobId) {
      console.error("No job ID found in session metadata");
      return new Response("No job ID found", { status: 400 });
    }

    const company = await prisma.user.findUnique({
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

    if (!company || !company.Company?.id) {
      return new Response("Aucune entreprise trouvée", { status: 400});
    }

     const job = await prisma.jobPost.findUnique({
      where: { id: jobId },
      select: {
        companyId: true,
        listingPlan: true,
      },
    });

    if (!job || job.companyId !== company.Company.id) {
      return new Response("Job introuvable pour ce client", { status: 400 });
    }

    const tier = jobListingDurationPricing.find(
      (pricing) => pricing.name === job.listingPlan
    );
    const creditsToAdd = tier?.jobLimit ?? 0;

    await prisma.$transaction([
      prisma.planCredit.upsert({
        where: {
          companyId_plan: {
            companyId: job.companyId,
            plan: job.listingPlan,
          },
        },
        update: {
          creditsPurchased: {
            increment: creditsToAdd,
          },
        },
        create: {
          companyId: job.companyId,
          plan: job.listingPlan,
          creditsPurchased: creditsToAdd,
        },
      }),
      prisma.jobPost.update({
        where: {
          id: jobId,
          companyId: company.Company.id,
        },
        data: {
          status: JobPostStatus.ACTIVE,
        },
      }),
    ]);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const customerEmail = session.customer_details?.email ?? undefined;

    // Retrieve invoice or receipt URL
    let invoiceUrl: string | undefined;
    try {
      if (session.invoice) {
        const invoice = await stripe.invoices.retrieve(session.invoice as string);
        invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || undefined;
      } else if (session.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent as string,
          { expand: ["latest_charge"] }
        );
        const charge = paymentIntent.latest_charge as Stripe.Charge;
        invoiceUrl = charge?.receipt_url || undefined;
      }
    } catch (err) {
      console.error("Error retrieving invoice URL:", err);
    }

    // Retrieve subscription details
    let plan = "";
    let price = "";
    let duration = "";
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 1,
        expand: ["data.price.product", "data.price.recurring"],
      });
      const item = lineItems.data[0];
      const priceObj = item.price as Stripe.Price;
      const product = priceObj.product as Stripe.Product;

      plan = product.name;
      price = priceObj.unit_amount
        ? (priceObj.unit_amount / 100).toFixed(2)
        : "";
      duration = priceObj.recurring?.interval ?? "";
    } catch (err) {
      console.error("Error retrieving subscription details:", err);
    }

    if (customerEmail) {
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
      } catch (err) {
        console.error("Error sending confirmation email:", err);
      }
    }
  }

  return new Response(null, { status: 200 });

}   