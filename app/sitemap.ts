import { MetadataRoute } from "next"
import { JobPostStatus, ListingPlan } from "@prisma/client"
import { prisma } from "@/app/utils/db"
import { planDuration } from "@/app/utils/pricingTiers"

export const dynamic = "force-dynamic" 
export const revalidate = 0

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://jobvert.fr"

type SitemapJob = {
  slug: string
  createdAt: Date
  updatedAt: Date
  validThrough: Date | null
  listingPlan: ListingPlan
}

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: `${BASE_URL}/`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: `${BASE_URL}/contact`,
    lastModified: new Date("2025-06-28"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/mentions-legales`,
    lastModified: new Date("2025-06-28"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/cgu`,
    lastModified: new Date("2025-06-28"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/pdc`,
    lastModified: new Date("2025-06-28"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
]

function getPlanExpirationDate(job: SitemapJob): Date | null {
  const durationDays = planDuration[job.listingPlan]

  if (!durationDays) {
    return null
  }

  return new Date(
    job.createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000
  )
}

function isIndexableJob(job: SitemapJob, now: Date): boolean {
  const planExpiration = getPlanExpirationDate(job)

  if (!planExpiration || planExpiration < now) {
    return false
  }

  if (job.validThrough && job.validThrough < now) {
    return false
  }

  return job.slug.trim().length > 0
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const jobs = await prisma.jobPost.findMany({
      where: {
        status: JobPostStatus.ACTIVE,
      },
      select: {
        slug: true,
        createdAt: true,
        updatedAt: true,
        validThrough: true,
        listingPlan: true,
      },
    })

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
    })

    const now = new Date()

    return [
      ...staticRoutes,
      // Offres
      ...jobs
        .filter((job) => isIndexableJob(job, now))
        .map((job) => ({
          url: `${BASE_URL}/job/${job.slug}`,
          lastModified: job.updatedAt,
          changeFrequency: "daily" as const,
          priority: 0.8,
        })),

      // Entreprises
      ...companies.map((company) => ({
        url: `${BASE_URL}/company/${company.id}`,
        lastModified: company.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ]
  } catch (error) {
    console.error("Sitemap generation error:", error)
    return staticRoutes
  }
}
