import { prisma } from "@/app/utils/db";
import { requireUser } from "@/app/utils/hook";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditCompanyForm } from "@/components/forms/EditCompanyForm";
import { notFound } from "next/navigation";

export default async function CompanySettingsPage() {
  const user = await requireUser();

  const company = await prisma.company.findUnique({
    where: {
      userId: user.id as string,
    },
  });

  if (!company) {
    return notFound();
  }

  return (
    <div className="py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Profil entreprise</h1>
        <p className="text-muted-foreground">
          Mettez à jour les informations affichées sur votre page publique.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>
            Actualisez votre identité visuelle, vos liens et votre description.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditCompanyForm
            company={{
              name: company.name,
              location: company.location,
              about: company.about,
              logo: company.logo,
              website: company.website,
              xAccount: company.xAccount,
              defaultListingPlan: company.defaultListingPlan ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}