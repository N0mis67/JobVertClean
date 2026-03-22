import { requireUser } from "@/app/utils/hook";
import { prisma } from "@/app/utils/db";
import { isUuid } from "@/app/utils/jobSlug";
import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/forms/ApplyForm";

interface ApplyPageProps {
  params: Promise<{ slug: string }>;
}

const ApplyPage = async ({ params }: ApplyPageProps) => {
  const { slug } = await params;

  const job = await prisma.jobPost.findFirst({
    where: {
      OR: [
        { slug },
        ...(isUuid(slug) ? [{ id: slug }] : []),
      ],
      status: "ACTIVE",
    },
    select: {
      id: true,
      slug: true,
    },
  });

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
