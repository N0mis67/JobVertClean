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
import { JobPostStatus, StoredFileKind } from "@prisma/client";
import { Resend } from "resend";
import { generateUniqueJobSlug } from "./utils/jobSlug";
import { signOut, updateSession } from "./utils/auth";
import {
  deleteOwnedStoredFile,
  markOwnedStoredFileAsAttached,
} from "./utils/uploadthing";
import { safeNotifyGoogleIndexingForJob } from "@/lib/google-indexing";
import { isJobPostPubliclyAvailable } from "./utils/jobPublication";

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

export async function deleteAccount() {
  const user = await requireUser();
  let deletedPublishedJobSlugs: string[] = [];

  try {
    deletedPublishedJobSlugs = await prisma.$transaction(async (tx) => {
      const userToDelete = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          email: true,
          stripeCustomerId: true,
        },
      });

      if (!userToDelete) {
        throw new Error("User not found");
      }

      const publishedJobs = await tx.jobPost.findMany({
        where: {
          company: {
            userId: user.id,
          },
          status: JobPostStatus.ACTIVE,
        },
        select: {
          slug: true,
        },
      });

      await tx.storedFile.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          attachedAt: null,
        },
      });

      await tx.verificationToken.deleteMany({
        where: {
          identifier: userToDelete.email,
        },
      });

      if (userToDelete.stripeCustomerId) {
        await tx.stripeCustomerCleanupJob.upsert({
          where: {
            stripeCustomerId: userToDelete.stripeCustomerId,
          },
          create: {
            stripeCustomerId: userToDelete.stripeCustomerId,
          },
          update: {},
        });
      }

      await tx.user.delete({
        where: {
          id: user.id,
        },
      });

      return publishedJobs.map((job) => job.slug);
    });
  } catch {
    return { success: false as const };
  }

  for (const slug of deletedPublishedJobSlugs) {
    revalidatePath(`/job/${slug}`);
    await safeNotifyGoogleIndexingForJob(slug, "URL_DELETED");
  }

  await signOut({ redirectTo: "/" });
}

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

  await markOwnedStoredFileAsAttached({
    userId: user.id,
    url: validatedData.logo,
    kind: StoredFileKind.COMPANY_LOGO,
  });

  await updateSession({
    user: {
      onboardingCompleted: true,
      userType: "COMPANY",
    },
  });

  return redirect("/");
}

export async function updateCompanyProfile(data: z.infer<typeof companySchema>) {
  const user = await requireUser();

  const company = await prisma.company.findUnique({
    where: {
      userId: user.id as string,
    },
    select: {
      id: true,
      logo: true,
      name: true,
      location: true,
      website: true,
      about: true,
    },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  const validatedData = companySchema.parse(data);

  const publicCompanyDetailsChanged =
    company.name !== validatedData.name ||
    company.location !== validatedData.location ||
    company.logo !== validatedData.logo ||
    company.website !== validatedData.website ||
    company.about !== validatedData.about;

  const updatedCompany = await prisma.company.update({
    where: { id: company.id },
    data: {
      ...validatedData,
    },
    select: {
      JobPost: {
        where: {
          status: JobPostStatus.ACTIVE,
        },
        select: {
          slug: true,
          status: true,
          createdAt: true,
          validThrough: true,
          listingPlan: true,
        },
      },
    },
  });

  if (publicCompanyDetailsChanged) {
    const publicJobs = updatedCompany.JobPost.filter((job) =>
      isJobPostPubliclyAvailable(job)
    );

    for (const job of publicJobs) {
      revalidatePath(`/job/${job.slug}`);
      await safeNotifyGoogleIndexingForJob(job.slug, "URL_UPDATED");
    }
  }

  await markOwnedStoredFileAsAttached({
    userId: user.id,
    url: validatedData.logo,
    kind: StoredFileKind.COMPANY_LOGO,
  });

  if (company.logo !== validatedData.logo) {
    try {
      await deleteOwnedStoredFile({
        userId: user.id,
        url: company.logo,
        kind: StoredFileKind.COMPANY_LOGO,
      });
    } catch {
      console.error(
        "Stored UploadThing file cleanup failed after company profile update."
      );
    }
  }

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

  await markOwnedStoredFileAsAttached({
    userId: user.id,
    url: validatedData.resume,
    kind: StoredFileKind.JOB_SEEKER_RESUME,
  });

  await updateSession({
    user: {
      onboardingCompleted: true,
      userType: "JOB_SEEKER",
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

  const slug = await generateUniqueJobSlug(prisma, {
    title: validatedData.jobTitle,
    city: validatedData.location,
  });

  const jobPost = await prisma.jobPost.create({
    data: {
      companyId: company.id,
      slug,
      jobDescription: validatedData.jobDescription,
      jobTitle: validatedData.jobTitle,
      employmentType: validatedData.employmentType,
      contractType: validatedData.contractType,
      location: validatedData.location,
      workplaceStreetAddress: validatedData.workplaceStreetAddress.trim(),
      workplacePostalCode: validatedData.workplacePostalCode.trim(),
      workplaceAddressLocality: validatedData.workplaceAddressLocality.trim(),
      salaryFrom: validatedData.salaryFrom,
      salaryTo: validatedData.salaryTo,
      listingPlan: validatedData.listingPlan,
      benefits: validatedData.benefits,
      ...(requiresPayment ? {} : { status: JobPostStatus.ACTIVE }),
    },
  });

  if (isJobPostPubliclyAvailable(jobPost)) {
    revalidatePath(`/job/${jobPost.slug}`);
    await safeNotifyGoogleIndexingForJob(jobPost.slug, "URL_UPDATED");
  }

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

  const existingJob = await prisma.jobPost.findFirst({
    where: {
      id: jobId,
      company: {
        userId: user.id,
      },
    },
    select: {
      id: true,
      slug: true,
      status: true,
      jobTitle: true,
      jobDescription: true,
      employmentType: true,
      contractType: true,
      location: true,
      workplaceStreetAddress: true,
      workplacePostalCode: true,
      workplaceAddressLocality: true,
      salaryFrom: true,
      salaryTo: true,
      listingPlan: true,
      benefits: true,
      createdAt: true,
      validThrough: true,
    },
  });

  if (!existingJob) {
    throw new Error("Job post not found");
  }

  const slug = await generateUniqueJobSlug(prisma, {
    title: validatedData.jobTitle,
    city: validatedData.location,
    excludeJobId: jobId,
  });

  const publicDetailsChanged =
    existingJob.slug !== slug ||
    existingJob.jobTitle !== validatedData.jobTitle ||
    existingJob.jobDescription !== validatedData.jobDescription ||
    existingJob.employmentType !== validatedData.employmentType ||
    existingJob.contractType !== validatedData.contractType ||
    existingJob.location !== validatedData.location ||
    existingJob.workplaceStreetAddress !==
      validatedData.workplaceStreetAddress.trim() ||
    existingJob.workplacePostalCode !==
      validatedData.workplacePostalCode.trim() ||
    existingJob.workplaceAddressLocality !==
      validatedData.workplaceAddressLocality.trim() ||
    existingJob.salaryFrom !== validatedData.salaryFrom ||
    existingJob.salaryTo !== validatedData.salaryTo ||
    existingJob.listingPlan !== validatedData.listingPlan ||
    JSON.stringify([...existingJob.benefits].sort()) !==
      JSON.stringify([...validatedData.benefits].sort());
  const existingJobWasPublic = isJobPostPubliclyAvailable(existingJob);

  const updatedJob = await prisma.jobPost.update({
    where: {
      id: existingJob.id,
    },
    data: {
      slug,
      jobDescription: validatedData.jobDescription,
      jobTitle: validatedData.jobTitle,
      employmentType: validatedData.employmentType,
      contractType: validatedData.contractType,
      location: validatedData.location,
      workplaceStreetAddress: validatedData.workplaceStreetAddress.trim(),
      workplacePostalCode: validatedData.workplacePostalCode.trim(),
      workplaceAddressLocality: validatedData.workplaceAddressLocality.trim(),
      salaryFrom: validatedData.salaryFrom,
      salaryTo: validatedData.salaryTo,
      listingPlan: validatedData.listingPlan,
      benefits: validatedData.benefits,
    },
    select: {
      slug: true,
      status: true,
      createdAt: true,
      validThrough: true,
      listingPlan: true,
    },
  });

  revalidatePath("/my-jobs");

  if (publicDetailsChanged) {
    const updatedJobIsPublic = isJobPostPubliclyAvailable(updatedJob);
    const slugChanged = existingJob.slug !== updatedJob.slug;

    if (slugChanged && existingJobWasPublic) {
      revalidatePath(`/job/${existingJob.slug}`);
      await safeNotifyGoogleIndexingForJob(
        existingJob.slug,
        "URL_DELETED"
      );
    }

    if (updatedJobIsPublic) {
      revalidatePath(`/job/${updatedJob.slug}`);
      await safeNotifyGoogleIndexingForJob(updatedJob.slug, "URL_UPDATED");
    } else if (!slugChanged && existingJobWasPublic) {
      revalidatePath(`/job/${updatedJob.slug}`);
      await safeNotifyGoogleIndexingForJob(updatedJob.slug, "URL_DELETED");
    }
  }

  return redirect("/my-jobs");
}

export async function deleteJobPost(jobId: string) {
  const user = await requireUser();

  const deletedJob = await prisma.$transaction(async (tx) => {
    const job = await tx.jobPost.findFirst({
      where: {
        id: jobId,
        company: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        slug: true,
        status: true,
      },
    });

    if (!job) {
      throw new Error("Job post not found");
    }

    await tx.jobPost.delete({
      where: {
        id: job.id,
      },
    });

    return job;
  });

  revalidatePath("/my-jobs");
  revalidatePath(`/job/${deletedJob.slug}`);

  if (deletedJob.status === JobPostStatus.ACTIVE) {
    await safeNotifyGoogleIndexingForJob(deletedJob.slug, "URL_DELETED");
  }

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

  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { slug: true },
  });

  if (job?.slug) {
    revalidatePath(`/job/${job.slug}`);
  }
}

export async function unsaveJobPost(savedJobPostId: string) {
  const user = await requireUser();

  const data = await prisma.savedJobPost.delete({
    where: {
      id: savedJobPostId,
      userId: user.id as string,
    },
    select: {
      job: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (data.job.slug) {
    revalidatePath(`/job/${data.job.slug}`);
  }
 
}
