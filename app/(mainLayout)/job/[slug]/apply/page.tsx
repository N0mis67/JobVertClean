import { requireUser } from "@/app/utils/hook";
import { prisma } from "@/app/utils/db";
import { isUuid } from "@/app/utils/jobSlug";
import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/forms/ApplyForm";

interface ApplyPageProps {
  params: Promise<{ slug: string }>;
}

function normalizeSlugCandidate(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLegacySlugCandidates(param: string): string[] {
  const normalized = normalizeSlugCandidate(param);

  if (!normalized) {
    return [];
  }

  const segments = normalized.split("-").filter(Boolean);
  const candidates: string[] = [];

  for (let i = segments.length; i >= Math.max(2, segments.length - 4); i -= 1) {
    const candidate = segments.slice(0, i).join("-");

    if (candidate) {
      candidates.push(candidate);
    }
  }

  return [...new Set(candidates)];
}

const ApplyPage = async ({ params }: ApplyPageProps) => {
  const { slug } = await params;

  let job = await prisma.jobPost.findFirst({
    where: {
      OR: [{ slug }, ...(isUuid(slug) ? [{ id: slug }] : [])],
      status: "ACTIVE",
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!job) {
    const legacyCandidates = getLegacySlugCandidates(slug).filter(
      (candidate) => candidate !== slug
    );

    for (const candidate of legacyCandidates) {
      job = await prisma.jobPost.findFirst({
        where: {
          slug: candidate,
          status: "ACTIVE",
        },
        select: {
          id: true,
          slug: true,
        },
      });

      if (job) {
        break;
      }
    }
  }

  if (!job) {
    return redirect("/");
  }

  if (job.slug !== slug) {
    return redirect(`/job/${job.slug}/apply`);
  }

  const user = await requireUser();
  if (!user) {
    return redirect("/login");
  }

  const { name, email } = user;
  let firstName = "";
  let lastName = "";
  if (name) {
    const parts = name.split(" ");
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  }

  return (
    <div className="container mx-auto py-8">
      <ApplyForm
        jobId={job.id}
        firstName={firstName}
        lastName={lastName}
        email={email ?? ""}
      />
    </div>
  );
};

export default ApplyPage;
