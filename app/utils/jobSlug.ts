import { PrismaClient } from "@prisma/client";
interface JobSlugInput {
  title: string;
  city?: string | null;
}

interface GenerateUniqueSlugInput extends JobSlugInput {
  excludeJobId?: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildJobSlugBase({ title, city }: JobSlugInput): string {
  const raw = [title, city].filter(Boolean).join(" ");

  const base = slugify(raw);

  return base || "job";
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function generateUniqueJobSlug(
  prisma: PrismaClient,
  { title, city, excludeJobId }: GenerateUniqueSlugInput
): Promise<string> {
  const baseSlug = buildJobSlugBase({ title, city });
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;
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
