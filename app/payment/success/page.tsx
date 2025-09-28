import { requireUser } from "@/app/utils/hook";
import { prisma } from "@/app/utils/db";
import { getCompanyPlanUsage } from "@/app/utils/subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Check } from "lucide-react";

export default async function PaymentSuccess() {
  const user = await requireUser();

  const company = await prisma.company.findUnique({
    where: {
      userId: user.id as string,
    },
    select: {
      id: true,
      name: true,
      lastUsedListingPlan: true,
      defaultListingPlan: true,
    },
  });

  const planUsage = company ? await getCompanyPlanUsage(company.id) : [];
  const currentPlan =
    company?.lastUsedListingPlan ||
    company?.defaultListingPlan ||
    planUsage[0]?.plan;
  const currentPlanUsage = currentPlan
    ? planUsage.find((plan) => plan.plan === currentPlan)
    : undefined;
    return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="space-y-6 p-6 text-center">
          <div className="flex justify-center">
            <Check className="size-12 rounded-full bg-green-500/20 p-2 text-green-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Paiement réussi</h1>
            <p className="text-sm text-muted-foreground">
              Votre offre est désormais active. Merci de votre confiance !
            </p>
          </div>

          {currentPlan ? (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Plan utilisé</p>
                  <p className="text-lg font-semibold">{currentPlan}</p>
                </div>
                <Badge variant="secondary">Quota</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentPlanUsage
                  ? `${currentPlanUsage.remaining} offre${
                      currentPlanUsage.remaining === 1 ? "" : "s"
                    } restante${currentPlanUsage.remaining === 1 ? "" : "s"}`
                  : "Quota à jour"}
              </p>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Les informations métier restent à renseigner pour votre prochaine offre. Seules les options liées au plan sont préremplies.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/post-job">Créer une autre offre</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/my-jobs">Retour au tableau de bord</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}