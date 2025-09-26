import { auth } from "@/app/utils/auth";
import { prisma } from "@/app/utils/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobPostStatus } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
} from "lucide-react";

const statusConfig: Record<
  JobPostStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ACTIVE: { label: "Actif", variant: "default" },
  EXPIRED: { label: "Expiré", variant: "destructive" },
  DRAFT: { label: "Brouillon", variant: "secondary" },
};

function ensureUrl(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function getXAccountLink(handle?: string | null) {
  if (!handle) return null;
  const trimmed = handle.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const normalized = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return `https://x.com/${normalized}`;
}

type Params = Promise<{ companyId: string }>;

export default async function CompanyProfilePage({
  params,
}: {
  params: Params;
}) {
  const { companyId } = await params;

  const session = await auth();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      logo: true,
      location: true,
      about: true,
      website: true,
      xAccount: true,
      userId: true,
      user: {
        select: {
          email: true,
        },
      },
      JobPost: {
        select: {
          id: true,
          jobTitle: true,
          status: true,
          createdAt: true,
          applications: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!company) {
    return notFound();
  }

  const isOwner = session?.user?.id === company.userId;

  const jobPosts = isOwner
    ? company.JobPost
    : company.JobPost.filter((job) => job.status === JobPostStatus.ACTIVE);

  const activeOffers = company.JobPost.filter(
    (job) => job.status === JobPostStatus.ACTIVE
  ).length;

  const websiteUrl = ensureUrl(company.website);
  const xAccountUrl = getXAccountLink(company.xAccount);

  return (
    <div className="py-10 space-y-10">
      <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative size-20 md:size-24 overflow-hidden rounded-xl border bg-muted">
            <Image
              src={
                company.logo || `https://avatar.vercel.sh/${company.name}?size=120`
              }
              alt={company.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="size-4" />
              Profil entreprise
            </div>
            <h1 className="text-3xl font-bold mt-2">{company.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full flex items-center gap-1">
                <MapPin className="size-3" />
                {company.location}
              </Badge>
              <Badge className="rounded-full">Secteur : Paysage</Badge>
              <Badge variant="outline" className="rounded-full">
                {activeOffers} offre
                {activeOffers === 0 || activeOffers > 1 ? "s" : ""} active
                {activeOffers === 0 || activeOffers > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/company/settings">Modifier le profil</Link>
            </Button>
            <Button asChild>
              <Link href="/post-job">Créer un job</Link>
            </Button>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>À propos</CardTitle>
            <CardDescription>
              Découvrez la vision et la mission de {company.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground whitespace-pre-line">
              {company.about}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
              <CardDescription>
                Contactez l&apos;équipe recrutement de {company.name}.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-1 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <Link
                  href={`mailto:${company.user.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {company.user.email}
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Globe className="mt-1 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Site web</p>
                {websiteUrl ? (
                  <Link
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {company.website}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Non renseigné</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ExternalLink className="mt-1 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Compte X</p>
                {xAccountUrl ? (
                  <Link
                    href={xAccountUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {company.xAccount}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Non renseigné</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Offres d&apos;emploi publiées</CardTitle>
            <CardDescription>
              {isOwner
                ? "Visualisez toutes vos offres, y compris les brouillons."
                : "Découvrez les opportunités actuellement ouvertes."}
            </CardDescription>
          </div>
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/post-job">Créer un job</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/my-jobs">Ouvrir le tableau de bord</Link>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {jobPosts.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {isOwner
                  ? "Aucune offre publiée pour le moment. Lancez votre première annonce !"
                  : "Cette entreprise n&apos;a pas d&apos;offre active actuellement."}
              </p>
              {isOwner && (
                <Button asChild>
                  <Link href="/post-job">Publier une offre</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Candidatures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobPosts.map((job) => {
                  const status = statusConfig[job.status];
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/job/${job.id}`}
                          className="hover:underline"
                        >
                          {job.jobTitle}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant}
                          className="rounded-full"
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.createdAt.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{job.applications}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}