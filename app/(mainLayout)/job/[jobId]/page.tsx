import { saveJobPost, unsaveJobPost } from "@/app/actions";
import arcjet, { detectBot, tokenBucket } from "@/app/utils/arcjet";
import { auth } from "@/app/utils/auth";
import { getFlagEmoji } from "@/app/utils/countriesList";
import { prisma } from "@/app/utils/db";
import { benefits } from "@/app/utils/listOfBenefits";
import { JsonToHtml } from "@/components/general/JsonToHtml";
import { SaveJobButton } from "@/components/general/SubmitButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { jobListingDurationPricing } from "@/app/utils/pricingTiers";
import { request } from "@arcjet/next";
import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const aj = arcjet.withRule(
  detectBot({
    mode: "LIVE",
    allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
  })
);

function getClient(session: boolean) {
  if (session) {
    return aj.withRule(
      tokenBucket({
        mode: "LIVE",
        capacity: 100,
        interval: 60,
        refillRate: 30,
      })
    );
  } else {
    return aj.withRule(
      tokenBucket({
        mode: "LIVE",
        capacity: 100,
        interval: 60,
        refillRate: 10,
      })
    );
  }
}

async function getJob(jobId: string, userId?: string) {
  const [jobData, savedJob] = await Promise.all([
    await prisma.jobPost.findUnique({
      where: {
        status: "ACTIVE",
        id: jobId,
      },
      select: {
        jobTitle: true,
        jobDescription: true,
        location: true,
        employmentType: true,
        benefits: true,
        createdAt: true,
        listingPlan: true,
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            location: true,
            about: true,
          },
        },
      },
    }),

    userId
      ? prisma.savedJobPost.findUnique({
          where: {
            userId_jobId: {
              userId,
              jobId,
            },
          },
          select: {
            id: true,
          },
        })
      : null,
  ]);

  if (!jobData) {
    return notFound();
  }

  return {
    jobData,
    savedJob,
  };
}

type Params = Promise<{ jobId: string }>;

export default async function JobIdPage({ params }: { params: Params }) {
  const { jobId } = await params;

  const session = await auth();

  const req = await request();

  const decision = await getClient(!!session).protect(req, { requested: 10 });

  if (decision.isDenied()) {
    throw new Error("forbidden");
  }

  const { jobData: data, savedJob } = await getJob(jobId, session?.user?.id);

  const locationFlag = getFlagEmoji(data.location);

  return (
    <div className="container mx-auto py-8">
      <div className="grid lg:grid-cols-[1fr,400px] gap-8">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{data.jobTitle}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-medium">{data.company.name}</span>

                <Badge className="rounded-full" variant="secondary">
                  {data.employmentType}
                </Badge>
                <span className="hidden md:inline text-muted-foreground">
                  •
                </span>
                <Badge className="rounded-full">
                  {locationFlag && <span className="mr-1">{locationFlag}</span>}
                  {data.location} uniquement
                </Badge>
              </div>
            </div>

            {session?.user ? (
              <form
                action={
                  savedJob
                    ? unsaveJobPost.bind(null, savedJob.id)
                    : saveJobPost.bind(null, jobId)
                }
              >
                <SaveJobButton savedJob={!!savedJob} />
              </form>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/login">
                  <Heart className="size-4 mr-2" />
                  Enregistrer
                </Link>
              </Button>
            )} 
          </div>

          <section>
            <JsonToHtml json={JSON.parse(data.jobDescription)} />
          </section>

          <section>
            <h3 className="font-semibold mb-4">
              Avantages{" "}
            </h3>
            <div className="flex flex-wrap gap-3">
              {benefits.map((benefit) => {
                const isOffered = data.benefits.includes(benefit.id);
                return (
                  <Badge
                    key={benefit.id}
                    variant={isOffered ? "default" : "outline"}
                    className={`text-sm px-4 py-1.5 rounded-full ${
                      !isOffered && " opacity-75 cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {benefit.icon}
                      {benefit.label}
                    </span>
                  </Badge>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Now Card */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Postuler maintenant</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                S'il vous plaît, laissez {data.company.name} savoir que vous avez trouvé cet emploi sur JobVert. Cela nous aide à grandir !
                </p>
              </div>
              <Button className="w-full">
                <Link href={`/job/${jobId}/apply`}>
                  Postuler maintenant
                </Link>
              </Button>
            </div>
          </Card>

          {/* Job Details Card */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">À propos du travail</h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                  Appliquer avant
                  </span>
                  <span className="text-sm">
                    {new Date(
                      data.createdAt.getTime() +
                     (jobListingDurationPricing.find(
                        (plan) => plan.name === data.listingPlan
                      )?.durationDays ?? 0) *
                        24 *
                        60 *
                        60 *
                        1000
                    ).toLocaleDateString("fr-FR", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Publié le
                  </span>
                  <span className="text-sm">
                    {data.createdAt.toLocaleDateString("fr-FR", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Type d'emploi
                  </span>
                  <span className="text-sm">{data.employmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Localisation
                  </span>
                  <Badge variant="secondary">{data.location}</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Company Card */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src={
                    data.company.logo ??
                    `https://avatar.vercel.sh/${data.company.name}`
                  }
                  alt={data.company.name}
                  width={48}
                  height={48}
                  className="rounded-full size-12"
                />
                <div>
                  <h3 className="font-semibold">{data.company.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {data.company.about}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/company/${data.company.id}`}>
                  Voir le profil entreprise
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
