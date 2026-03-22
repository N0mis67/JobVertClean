import { saveJobPost, unsaveJobPost } from "@/app/actions";
import arcjet, { detectBot, tokenBucket } from "@/app/utils/arcjet";
import { auth } from "@/app/utils/auth";
import { getFlagEmoji } from "@/app/utils/countriesList";
import { prisma } from "@/app/utils/db";
import { isUuid } from "@/app/utils/jobSlug";
import { benefits } from "@/app/utils/listOfBenefits";
import { jobListingDurationPricing } from "@/app/utils/pricingTiers";
import { JsonToHtml } from "@/components/general/JsonToHtml";
import { SaveJobButton } from "@/components/general/SubmitButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { request } from "@arcjet/next";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Heart } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://jobvert.fr";
const FALLBACK_DESCRIPTION =
  "<p>Consultez cette offre d'emploi sur JobVert pour en savoir plus sur les missions, le profil recherche et les modalites de candidature.</p>";
const FALLBACK_TITLE = "Offre d'emploi";
const FALLBACK_COMPANY_NAME = "Entreprise";
const FALLBACK_LOCATION = "France";

type Params = Promise<{ slug: string }>;

function getEmploymentType(employmentType: string): string {
  const normalized = employmentType.trim().toLowerCase();

  switch (normalized) {
    case "cdi":
      return "FULL_TIME";
    case "cdd":
      return "TEMPORARY";
    case "freelance":
      return "CONTRACTOR";
    case "internship":
      return "INTERN";
    case "temps plein":
      return "FULL_TIME";
    case "temps partiel":
      return "PART_TIME";
    case "intérim":
    case "interim":
      return "TEMPORARY";
    case "apprentissage":
      return "INTERN";
    default:
      return "OTHER";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDescriptionHtml(description: string): string {
  try {
    const parsed = JSON.parse(description);
    const renderNode = (node: unknown): string => {
      if (!node || typeof node !== "object") {
        return "";
      }

      const currentNode = node as {
        type?: unknown;
        text?: unknown;
        content?: unknown;
      };

      if (typeof currentNode.text === "string") {
        return escapeHtml(currentNode.text);
      }

      const content = Array.isArray(currentNode.content)
        ? currentNode.content.map(renderNode).join("")
        : "";

      switch (currentNode.type) {
        case "doc":
          return content;
        case "paragraph":
          return content.trim() ? `<p>${content}</p>` : "";
        case "bulletList":
          return content.trim() ? `<ul>${content}</ul>` : "";
        case "orderedList":
          return content.trim() ? `<ol>${content}</ol>` : "";
        case "listItem":
          return content.trim() ? `<li>${content}</li>` : "";
        case "hardBreak":
          return "<br />";
        default:
          return content;
      }
    };

    const html = renderNode(parsed).trim();
    return html.length >= 40 ? html : FALLBACK_DESCRIPTION;
  } catch {
    const rawDescription = description.trim();
    return rawDescription.length >= 40
      ? `<p>${escapeHtml(rawDescription)}</p>`
      : FALLBACK_DESCRIPTION;
  }
}

function toIsoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function cleanJsonLd<T>(value: T): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((entry) => cleanJsonLd(entry))
      .filter((entry) => entry !== undefined);

    return cleanedArray.length > 0 ? (cleanedArray as T) : undefined;
  }

  if (typeof value === "object") {
    const cleanedEntries = Object.entries(value).flatMap(([key, entry]) => {
      const cleanedEntry = cleanJsonLd(entry);

      return cleanedEntry === undefined ? [] : [[key, cleanedEntry] as const];
    });

    return cleanedEntries.length > 0
      ? (Object.fromEntries(cleanedEntries) as T)
      : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? (trimmed as T) : undefined;
  }

  return value;
}

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
  }

  return aj.withRule(
    tokenBucket({
      mode: "LIVE",
      capacity: 100,
      interval: 60,
      refillRate: 10,
    })
  );
}

async function findJobByParam(param: string) {
  const bySlug = await prisma.jobPost.findUnique({
    where: {
      slug: param,
      status: "ACTIVE",
    },
    select: {
      id: true,
      slug: true,
      jobTitle: true,
      location: true,
    },
  });

  if (bySlug) {
    return bySlug;
  }

  if (!isUuid(param)) {
    return null;
  }

  return prisma.jobPost.findUnique({
    where: {
      id: param,
      status: "ACTIVE",
    },
    select: {
      id: true,
      slug: true,
      jobTitle: true,
      location: true,
    },
  });
}

async function getJobDetails(slug: string, userId?: string) {
  const [jobData, savedJob] = await Promise.all([
    prisma.jobPost.findUnique({
      where: {
        slug,
        status: "ACTIVE",
      },
      select: {
        id: true,
        slug: true,
        jobTitle: true,
        jobDescription: true,
        location: true,
        employmentType: true,
        salaryFrom: true,
        salaryTo: true,
        benefits: true,
        createdAt: true,
        updatedAt: true,
        validThrough: true,
        listingPlan: true,
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            website: true,
            location: true,
            about: true,
          },
        },
      },
    }),
    userId
      ? prisma.savedJobPost.findFirst({
          where: {
            userId,
            job: {
              slug,
            },
          },
          select: {
            id: true,
          },
        })
      : null,
  ]);

  if (!jobData) {
    return null;
  }

  return {
    jobData,
    savedJob,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await findJobByParam(slug);

  if (!job) {
    return {
      title: "Offre introuvable | JobVert",
    };
  }

  return {
    title: `${job.jobTitle} - ${job.location} | JobVert`,
    alternates: {
      canonical: `/job/${job.slug}`,
    },
  };
}

export default async function JobPage({ params }: { params: Params }) {
  const { slug: routeParam } = await params;

  const session = await auth();
  const req = await request();
  const decision = await getClient(!!session).protect(req, { requested: 10 });

  if (decision.isDenied()) {
    throw new Error("forbidden");
  }

  const resolved = await findJobByParam(routeParam);

  if (!resolved) {
    return notFound();
  }

  if (isUuid(routeParam)) {
    redirect(`/job/${resolved.slug}`);
  }

  const payload = await getJobDetails(resolved.slug, session?.user?.id);

  if (!payload) {
    return notFound();
  }

  const { jobData: data, savedJob } = payload;

  const locationFlag = getFlagEmoji(data.location);

  const validThrough = new Date(
    data.createdAt.getTime() +
      (jobListingDurationPricing.find((plan) => plan.name === data.listingPlan)
        ?.durationDays ??
        0) *
        24 *
        60 *
        60 *
        1000
  );

  if (validThrough < new Date()) {
    notFound();
  }

  const descriptionHtml = getDescriptionHtml(data.jobDescription);
  const companyName = data.company.name?.trim() || FALLBACK_COMPANY_NAME;
  const jobLocation = data.location?.trim() || FALLBACK_LOCATION;
  const datePosted = toIsoDate(data.createdAt) ?? new Date().toISOString();
  const validThroughIso =
    toIsoDate(data.validThrough) ?? toIsoDate(validThrough) ?? datePosted;
  const hasSalary =
    Number.isFinite(data.salaryFrom) &&
    data.salaryFrom > 0 &&
    Number.isFinite(data.salaryTo) &&
    data.salaryTo > 0;

  const jobPostingSchema = cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: data.jobTitle?.trim() || FALLBACK_TITLE,
    description: descriptionHtml,
    datePosted,
    validThrough: validThroughIso,
    employmentType: getEmploymentType(data.employmentType || "CDI"),
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
      sameAs: data.company.website?.trim(),
      logo:
        data.company.logo ??
        `https://avatar.vercel.sh/${encodeURIComponent(companyName)}`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: jobLocation,
        addressCountry: "FR",
      },
    },
    identifier: {
      "@type": "PropertyValue",
      name: "JobVert",
      value: data.id,
    },
    url: `${BASE_URL}/job/${data.slug}`,
    directApply: true,
    dateModified: toIsoDate(data.updatedAt),
    jobBenefits: benefits
      .filter((benefit) => data.benefits.includes(benefit.id))
      .map((benefit) => benefit.label),
    baseSalary: hasSalary
      ? {
          "@type": "MonetaryAmount",
          currency: "EUR",
          value:
            data.salaryFrom === data.salaryTo
              ? {
                  "@type": "QuantitativeValue",
                  value: data.salaryFrom,
                  unitText: "YEAR",
                }
              : {
                  "@type": "QuantitativeValue",
                  minValue: data.salaryFrom,
                  maxValue: data.salaryTo,
                  unitText: "YEAR",
                },
        }
      : undefined,
  });

  return (
    <div className="container mx-auto py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jobPostingSchema),
        }}
      />
      <div className="grid lg:grid-cols-[1fr,400px] gap-8">
        <div className="space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{data.jobTitle}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-medium">{data.company.name}</span>

                <Badge className="rounded-full" variant="secondary">
                  {data.employmentType}
                </Badge>
                <span className="hidden md:inline text-muted-foreground">•</span>
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
                    : saveJobPost.bind(null, data.id)
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
            <h3 className="font-semibold mb-4">Avantages </h3>
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

        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Postuler maintenant</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  S&apos;il vous plaît, laissez {data.company.name} savoir que vous
                  avez trouvé cet emploi sur JobVert. Cela nous aide à grandir !
                </p>
              </div>
              <Button className="w-full" asChild>
                <Link href={`/job/${data.slug}/apply`}>Postuler maintenant</Link>
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">À propos du travail</h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Appliquer avant</span>
                  <span className="text-sm">
                    {validThrough.toLocaleDateString("fr-FR", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Publié le</span>
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
                    Type d&apos;emploi
                  </span>
                  <span className="text-sm">{data.employmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Localisation</span>
                  <Badge variant="secondary">{data.location}</Badge>
                </div>
              </div>
            </div>
          </Card>

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
}
