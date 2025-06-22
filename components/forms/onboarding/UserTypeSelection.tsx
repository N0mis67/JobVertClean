import { Button } from "@/components/ui/button";
import { Building2, UserRound } from "lucide-react";

type UserType = "Entreprise" | "Demandeur d'emploi";

interface UserTypeSelectionProps {
  onSelect: (type: UserType) => void;
}

export default function UserTypeSelection({
  onSelect,
}: UserTypeSelectionProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold ">Bienvenue !</h2>
        <p className="text-muted-foreground">
        Comment souhaitez-vous utiliser notre plateforme ?
        </p>
      </div>

      <div className="grid gap-4">
        <Button
          onClick={() => onSelect("Entreprise")}
          variant="outline"
          className="w-full h-auto p-6 flex items-center gap-4 border-2 transition-all duration-200 hover:border-primary hover:bg-primary/5"
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">Entreprise</h3>
            <p className="text-sm text-muted-foreground">
            Publiez des jobs et trouvez des talents

            </p>
          </div>
        </Button>

        <Button
          onClick={() => onSelect("Demandeur d'emploi")}
          variant="outline"
          className="w-full h-auto p-6 flex items-center gap-4 border-2 transition-all duration-200 hover:border-primary hover:bg-primary/5"
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserRound className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">Demandeur d'emploi</h3>
            <p className="text-sm text-muted-foreground">
              Trouvez le job de vos rêves
            </p>
          </div>
        </Button>
      </div>
    </div>
  );
}