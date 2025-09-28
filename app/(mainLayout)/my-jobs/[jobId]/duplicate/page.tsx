import { prisma } from "@/app/utils/db";
import { requireUser } from "@/app/utils/hook";
import { JobPostStatus } from "@prisma/client";
import { redirect } from "next/navigation";

type Params = Promise<{ jobId: string }>;

export default async function DuplicateJobPage({
  params,
}: {
  params: Params;
}) {
  const { jobId } = await params;
  const user = await requireUser();

  const original = await prisma.jobPost.findUnique({
    where: {
      id: jobId,
      company: {
        userId: user.id as string,
      },
    },
    select: {
      companyId: true,
      jobTitle: true,
      employmentType: true,
      location: true,
      salaryFrom: true,
      salaryTo: true,
      jobDescription: true,
      benefits: true,
      listingPlan: true,
    },
  });

  if (!original) {
    return redirect("/my-jobs");
  }

  const duplicatedTitle = original.jobTitle.endsWith("(copie)")
    ? original.jobTitle
    : `${original.jobTitle} (copie)`;

  const duplicated = await prisma.jobPost.create({
    data: {
      companyId: original.companyId,
      jobTitle: duplicatedTitle,
      employmentType: original.employmentType,
      location: original.location,
      salaryFrom: original.salaryFrom,
      salaryTo: original.salaryTo,
      jobDescription: original.jobDescription,
      benefits: original.benefits,
      listingPlan: original.listingPlan,
      status: JobPostStatus.DRAFT,
    },
  });

  return redirect(`/my-jobs/${duplicated.id}/edit?source=duplicate`);
}