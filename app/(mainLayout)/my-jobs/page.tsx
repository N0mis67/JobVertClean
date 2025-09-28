import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PenBoxIcon, User2, XCircle, CopyPlus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/general/EmptyState";
import { prisma } from "@/app/utils/db";
import { requireUser } from "@/app/utils/hook";
import { CopyLinkMenuItem } from "@/components/general/CopyLink";
import { PlanUsageSummary } from "@/components/subscription/PlanUsageSummary";
import { Badge } from "@/components/ui/badge";
import { getCompanyPlanUsage } from "@/app/utils/subscription";

async function getJobs(userId: string) {
  const data = await prisma.jobPost.findMany({
    where: {
      company: {
        userId: userId,
      },
    },
    select: {
      id: true,
      jobTitle: true,
      status: true,
      createdAt: true,
      applications: true,
      company: {
        select: {
          name: true,
          logo: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data;
}

const MyJobs = async () => {
  const session = await requireUser();
  const company = await prisma.company.findUnique({
    where: {
      userId: session.id as string,
    },
    select: {
      id: true,
      defaultListingPlan: true,
      lastUsedListingPlan: true,
    },
  });

  if (!company) {
    return (
      <EmptyState
        title="Aucune entreprise trouvée"
        description="Complétez votre profil entreprise pour commencer à publier des offres."
        buttonText="Compléter mon profil"
        href="/onboarding"
      />
    );
  }

  const [data, planUsage] = await Promise.all([
    getJobs(session.id as string),
    getCompanyPlanUsage(company.id),
  ]);

  const highlightedPlan =
    company.lastUsedListingPlan ||
    company.defaultListingPlan ||
    planUsage[0]?.plan;

  const blockedPlans = planUsage.filter((plan) => plan.remaining === 0);

  return (
    <>
    <Card className="mb-6">
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Quota restant</CardTitle>
            <CardDescription>
              Suivez votre consommation par abonnement et anticipez les prochaines publications.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {highlightedPlan ? (
              <Badge variant="secondary">Plan prioritaire : {highlightedPlan}</Badge>
            ) : null}
            {company.defaultListingPlan ? (
              <span>Préférence définie : {company.defaultListingPlan}</span>
            ) : (
              <span>Préférence : toujours demander</span>
            )}
          </div>
          {blockedPlans.length > 0 ? (
            <p className="text-sm text-red-600">
              {blockedPlans.length === 1
                ? `Le plan ${blockedPlans[0].plan} a atteint son quota.`
                : "Certains plans ont atteint leur quota."}{" "}
              <Link href="/contact" className="underline">
                Augmenter mon plan
              </Link>
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <PlanUsageSummary planUsage={planUsage} highlightPlan={highlightedPlan ?? undefined} />
        </CardContent>
      </Card>

      {data.length === 0 ? (
        <EmptyState
          title="Aucun job trouvé"
          description="Vous n'avez pas encore de job."
          buttonText="Créer un job"
          href="/post-job"
        />
      ) : (
        <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Mes Jobs</CardTitle>
              <CardDescription>
                Gérez vos offres d&apos;emploi et suivez vos candidatures.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/post-job">Créer un job</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/company/settings">Modifier le profil entreprise</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Titre du job </TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Candidats</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      {listing.company.logo ? (
                        <Image
                          src={listing.company.logo}
                          alt={`${listing.company.name} logo`}
                          width={40}
                          height={40}
                          className="rounded-md size-10"
                        />
                      ) : (
                        <div className="bg-red-500 size-10 rounded-lg flex items-center justify-center">
                          <User2 className="size-6 text-white" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {listing.company.name}
                    </TableCell>
                    <TableCell>{listing.jobTitle}</TableCell>
                    <TableCell>
                      {listing.status.charAt(0).toUpperCase() +
                        listing.status.slice(1).toLowerCase()}
                    </TableCell>
                    <TableCell>{listing.applications}</TableCell>
                    <TableCell>
                      {listing.createdAt.toLocaleDateString("fr-FR", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/my-jobs/${listing.id}/edit`}>
                              <PenBoxIcon className="size-4" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/my-jobs/${listing.id}/duplicate`}>
                              <CopyPlus className="size-4" />
                              Dupliquer
                            </Link>
                          </DropdownMenuItem>
                          <CopyLinkMenuItem
                            jobUrl={`${process.env.NEXT_PUBLIC_URL}/job/${listing.id}`}
                          />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/my-jobs/${listing.id}/delete`}>
                              <XCircle className="h-4 w-4" />
                              Supprimer
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default MyJobs;