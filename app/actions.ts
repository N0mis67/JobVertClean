"use server";

import { z } from "zod";
import { requireUser } from "./utils/hook";
import { companySchema, jobSchema, jobSeekerSchema } from "./utils/zodSchemas";
import { prisma } from "./utils/db";
import { redirect } from "next/navigation";
import { stripe } from "./utils/stripe";
import { jobListingDurationPricing, planDuration } from "./utils/pricingTiers";
import { revalidatePath } from "next/cache";
import arcjet, { detectBot, shield } from "./utils/arcjet";
import { request } from "@arcjet/next";
import { inngest } from "./utils/inngest/client";
import { JobPostStatus } from "@prisma/client";
import { Resend } from "resend";

const resend =
  process.env.RESEND_API_KEY !== undefined
    ? new Resend(process.env.RESEND_API_KEY)
    : undefined;


const aj = arcjet
  .withRule(
    shield({
      mode: "LIVE",
    })
  )
  .withRule(
    detectBot({
      mode: "LIVE",
      allow: [],
    })
  );

export async function createCompany(data: z.infer<typeof companySchema>) {
  const user = await requireUser();

  // Access the request object so Arcjet can analyze it
  const req = await request();
  // Call Arcjet protect
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    throw new Error("Forbidden");
  }

  // Server-side validation
  const validatedData = companySchema.parse(data);

  console.log(validatedData);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      onboardingCompleted: true,
      userType: "COMPANY",
      Company: {
        create: {
          ...validatedData,
        },
      },
    },
  });

  return redirect("/");
}

export async function updateCompanyProfile(data: z.infer<typeof companySchema>) {
  const user = await requireUser();

  const validatedData = companySchema.parse(data);

  const company = await prisma.company.findUnique({
    where: {
      userId: user.id as string,
    },
    select: {
      id: true,
    },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      ...validatedData,
    },
  });

  revalidatePath(`/company/${company.id}`);
  revalidatePath("/post-job");
  revalidatePath("/my-jobs");
}

export async function createJobSeeker(data: z.infer<typeof jobSeekerSchema>) {
  const user = await requireUser();

  // Access the request object so Arcjet can analyze it
  const req = await request();
  // Call Arcjet protect
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    throw new Error("Forbidden");
  }

  const validatedData = jobSeekerSchema.parse(data);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      onboardingCompleted: true,
      userType: "JOB_SEEKER",
      JobSeeker: {
        create: {
          ...validatedData,
        },
      },
    },
  });

  return redirect("/");
}

export async function createJob(data: z.infer<typeof jobSchema>) {
  const user = await requireUser();

  const validatedData = jobSchema.parse(data);

  const company = await prisma.company.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,

      user: {
        select: {
          stripeCustomerId: true,
        },
      },
    },
  });

  if (!company?.id) {
    return redirect("/");
  }

  const pricingTier = jobListingDurationPricing.find(
    (tier) => tier.name === validatedData.listingPlan
  );

  if (!pricingTier) {
    throw new Error("Invalid listing plan selected");
  }

  const [activePosts, planCredit] = await Promise.all([
    prisma.jobPost.count({
      where: {
        companyId: company.id,
        listingPlan: validatedData.listingPlan,
        status: JobPostStatus.ACTIVE,
      },
    }),
    prisma.planCredit.findUnique({
      where: {
        companyId_plan: {
          companyId: company.id,
          plan: validatedData.listingPlan,
        },
      },
      select: {
        creditsPurchased: true,
      },
    }),
  ]);

  const purchasedCredits = planCredit?.creditsPurchased ?? 0;
  const remainingCredits = Math.max(purchasedCredits - activePosts, 0);
  //const requiresPayment = remainingCredits <= 0;
  const freeMode = process.env.NEXT_PUBLIC_FREE_POSTING === "true";
  const requiresPayment = !freeMode && remainingCredits <= 0;

  const jobPost = await prisma.jobPost.create({
    data: {
      companyId: company.id,
      jobDescription: validatedData.jobDescription,
      jobTitle: validatedData.jobTitle,
      employmentType: validatedData.employmentType,
      location: validatedData.location,
      salaryFrom: validatedData.salaryFrom,
      salaryTo: validatedData.salaryTo,
      listingPlan: validatedData.listingPlan,
      benefits: validatedData.benefits,
      ...(requiresPayment ? {} : { status: JobPostStatus.ACTIVE }),
    },
  });

   if (!requiresPayment && resend && user.email) {
    try {
      await resend.emails.send({
        from: "JobVert <contact@jobvert.fr>",
        to: [user.email],
        subject: "Votre offre d'emploi est en ligne",
        html: `
          <p>Bonjour ${user.name ?? ""},</p>
          <p>Votre offre <strong>${validatedData.jobTitle}</strong> est désormais publiée.</p>
          <p>Plan sélectionné : ${validatedData.listingPlan}</p>
          <p>Lieu : ${validatedData.location}</p>
          <p>Merci d'utiliser JobVert pour vos recrutements.</p>
        `,
      });
    } catch (error) {
      console.error("Error sending job publication email:", error);
    }
  }

  // Trigger the job expiration function
  await inngest.send({
    name: "job/created",
    data: {
      jobId: jobPost.id,
      expirationDays: planDuration[validatedData.listingPlan],
    },
  });

  await prisma.company.update({
    where: { id: company.id },
    data: { lastUsedListingPlan: validatedData.listingPlan },
  });

  revalidatePath("/post-job");
  revalidatePath("/my-jobs");
  revalidatePath("/payment/success");

  if (freeMode) {
    return redirect("/payment/success");
  }
 
  if (requiresPayment) {
    let stripeCustomerId = company.user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
      });

      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            product_data: {
              name: `Job Posting - ${pricingTier.durationDays} Days`,
              description: pricingTier.features.join(","),
              images: [
                "https://pve1u6tfz1.ufs.sh/f/Ae8VfpRqE7c0gFltIEOxhiBIFftvV4DTM8a13LU5EyzGb2SQ",
              ],
            },
            currency: "EUR",
            unit_amount: pricingTier.priceMonthly * 100, // Convert to cents for Stripe
           
          },
          quantity: 1,
        },
        ],
      mode: "payment",
      invoice_creation: { enabled: true },
      billing_address_collection: "required",
      metadata: {
        jobId: jobPost.id,
        listingPlan: validatedData.listingPlan,
      },
      success_url: `${process.env.NEXT_PUBLIC_URL}/payment/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/payment/cancel`,
     });

     return redirect(session.url as string);
  }
    
  return redirect("/payment/success");
}

export async function updateJobPost(
  data: z.infer<typeof jobSchema>,
  jobId: string
) {
  const user = await requireUser();

  const validatedData = jobSchema.parse(data);

  await prisma.jobPost.update({
    where: {
      id: jobId,
      company: {
        userId: user.id,
      },
    },
    data: {
      jobDescription: validatedData.jobDescription,
      jobTitle: validatedData.jobTitle,
      employmentType: validatedData.employmentType,
      location: validatedData.location,
      salaryFrom: validatedData.salaryFrom,
      salaryTo: validatedData.salaryTo,
      listingPlan: validatedData.listingPlan,
      benefits: validatedData.benefits,
    },
  });

  return redirect("/my-jobs");
}

export async function deleteJobPost(jobId: string) {
  const user = await requireUser();

  await prisma.jobPost.delete({
    where: {
      id: jobId,
      company: {
        userId: user.id,
      },
    },
  });

  return redirect("/my-jobs");
}

export async function saveJobPost(jobId: string) {
  const user = await requireUser();

  await prisma.savedJobPost.create({
    data: {
      jobId: jobId,
      userId: user.id as string,
    },
  });

  revalidatePath(`/job/${jobId}`);
}

export async function unsaveJobPost(savedJobPostId: string) {
  const user = await requireUser();

  const data = await prisma.savedJobPost.delete({
    where: {
      id: savedJobPostId,
      userId: user.id as string,
    },
    select: {
      jobId: true,
    },
  });

  revalidatePath(`/job/${data.jobId}`);
 
}
