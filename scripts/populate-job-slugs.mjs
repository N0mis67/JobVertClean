import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBaseSlug(title, city) {
  const raw = [title, city].filter(Boolean).join(" ");
  const slug = slugify(raw);
  return slug || "job";
}

async function generateUniqueJobSlug(title, city, excludeJobId) {
  const base = buildBaseSlug(title, city);
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    const existing = await prisma.jobPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeJobId) {
      return candidate;
    }

    suffix += 1;
  }
}

async function main() {
  const jobs = await prisma.jobPost.findMany({
    select: {
      id: true,
      jobTitle: true,
      location: true,
      slug: true,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const job of jobs) {
    const slug = await generateUniqueJobSlug(job.jobTitle, job.location, job.id);

    if (job.slug !== slug) {
      await prisma.jobPost.update({
        where: { id: job.id },
        data: { slug },
      });
      console.log(`Updated ${job.id} -> ${slug}`);
    }
  }

  console.log(`Processed ${jobs.length} job posts.`);
}

main()
  .catch((error) => {
    console.error("Failed to populate job slugs", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
