import { requireUser } from "@/app/utils/hook";
import { DeleteAccountSection } from "@/components/general/DeleteAccountSection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AccountSettingsPage() {
  const user = await requireUser();

  return (
    <div className="py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Paramètres du compte</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres liés à votre compte JobVert.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compte</CardTitle>
          <CardDescription>
            Vos informations personnelles actuellement enregistrées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Nom</dt>
              <dd className="font-medium">{user.name || "Non renseigné"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Adresse email
              </dt>
              <dd className="break-all font-medium">
                {user.email || "Non renseignée"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <DeleteAccountSection />
    </div>
  );
}
