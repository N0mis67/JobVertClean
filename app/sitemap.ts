import { MetadataRoute } from "next"
import { PrismaClient, JobPostStatus } from "@prisma/client"

export const dynamic = "force-dynamic" 

const prisma = new PrismaClient()

const BASE_URL = "https://jobvert.fr"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const jobs = await prisma.jobPost.findMany({
      where: {
        status: JobPostStatus.ACTIVE,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
    })

    return [
      // Pages statiques
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

      // Offres
      ...jobs.map((job) => ({
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
    return []
  } finally {
    await prisma.$disconnect()
  }
}
