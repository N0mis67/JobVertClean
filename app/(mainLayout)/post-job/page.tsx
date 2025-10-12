import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import React from "react";
import { CreateJobForm } from "@/components/forms/CreateJobForm";
import { prisma } from "@/app/utils/db";
import { requireUser } from "@/app/utils/hook";
import { redirect } from "next/navigation";
import {
  getCompanyPlanUsage,
  resolveInitialPlan,
} from "@/app/utils/subscription";



const advantages = [
  {
    title: "Candidats qualifiés",
    description:
      "Communauté exclusivement composée de professionnels du paysage\u00a0: jardiniers, \u00e9lagueurs, chefs d\u2019\u00e9quipe, architectes paysagistes, etc.",
    stat: "100%",
    statDescription: "d\u00e9di\u00e9 au secteur des espaces verts",
  },
  {
   title: "Recrutement rapide",
    description:
      "Recevez vos premi\u00e8res candidatures en moins de 48\u00a0h et pourvoyez jusqu\u2019\u00e0 80\u00a0% des postes en un mois.",
    stat: "48\u00a0h",
    statDescription: "pour obtenir vos premi\u00e8res candidatures",
  },
  {
   title: "Visibilit\u00e9 cibl\u00e9e",
    description:
      "Vos offres sont vues par des centaines de professionnels actifs du secteur, pr\u00eats \u00e0 s\u2019engager.",
    stat: "15\u00a0000+",
    statDescription: "professionnels du paysage atteints",
  },
  {
    title: "Simplicit\u00e9 & accompagnement",
    description:
      "Publiez une offre en 5\u00a0minutes. Interface intuitive et aide \u00e0 l\u2019optimisation de vos annonces.",
    stat: "5\u00a0min",
    statDescription: "pour mettre en ligne votre annonce",
  },
];

const stats = [
  { value: "80%", label: "des postes pourvus en un mois" },
  { value: "4,8/5", label: "de satisfaction recruteur" },
  { value: "300+", label: "entreprises accompagn\u00e9es" },
  { value: "10k+", label: "talents actifs chaque mois" },
];

const sectorRoles = [
  "Jardinier / Ouvrier paysagiste",
  "Chef d\u2019\u00e9quipe espaces verts",
  "Architecte paysagiste",
  "\u00c9lagueur-grimpeur",
  "Horticulteur",
];

async function getCompany(userId: string) {
  const data = await prisma.company.findUnique({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      name: true,
      location: true,
      about: true,
      logo: true,
      xAccount: true,
      website: true,
      defaultListingPlan: true,
      lastUsedListingPlan: true,
    },
  });

  if (!data) {
    return redirect("/");
  }
  return data;
}

const PostJobPage = async () => {
  const session = await requireUser();
  const data = await getCompany(session.id as string);
  const planUsage = await getCompanyPlanUsage(data.id);
  const { plan: initialPlan, reason } = resolveInitialPlan(planUsage, {
    lastUsed: data.lastUsedListingPlan,
    defaultPlan: data.defaultListingPlan,
  });
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
      <CreateJobForm
        companyAbout={data.about}
        companyLocation={data.location}
        companyLogo={data.logo}
        companyName={data.name}
        companyXAccount={data.xAccount}
        companyWebsite={data.website}
        planUsage={planUsage}
        initialPlan={initialPlan}
        autoSelectionReason={reason}
        defaultListingPlan={data.defaultListingPlan ?? null}
      />

      <div className="col-span-1">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-xl">
            Pourquoi publier vos offres sur <span className="text-primary">JobVert</span> ?
            </CardTitle>
            <CardDescription>
              JobVert est la plateforme 100% dédiée à l’aménagement paysager. Recrutez plus
              rapidement des candidats qualifiés grâce à une communauté engagée et un outil simple
              d’utilisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

             {/* Advantages */}
            <div className="space-y-6">
              {advantages.map((advantage, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-muted-foreground/10 p-4"
                >
                  <h3 className="text-base font-semibold">{advantage.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {advantage.description}
                  </p>
                  <div className="mt-3 flex items-baseline gap-2 text-primary">
                    <span className="text-2xl font-bold">{advantage.stat}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {advantage.statDescription}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

          {/* Sector roles */}
            <div className="rounded-lg border border-muted-foreground/10 p-4">
              <h3 className="text-base font-semibold">Métiers représentés sur JobVert</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {sectorRoles.join(" • ")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJobPage;