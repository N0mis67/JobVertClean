import { PasswordLoginForm } from "./PasswordLoginForm";
import { GeneralSubmitButton } from "../general/SubmitButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { ReactNode } from "react";
import { GoogleIcon } from "../icons/GoogleIcon";
import { signInWithGoogle } from "@/app/utils/auth-actions";

type LoginFormProps = {
  title?: string;
  description?: string;
  googleButtonText?: string;
  emailSubmitText?: string;
  bottomSlot?: ReactNode;
};

export function LoginForm({
  title = "Heureux de vous revoir",
  description = "Connectez-vous avec Google, votre mot de passe ou recevez un lien sécurisé par e-mail.",
  googleButtonText = "Continuer avec Google",
  bottomSlot,
}: LoginFormProps = {}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
           <form action={signInWithGoogle} className="flex flex-col gap-4">
              <GeneralSubmitButton
                text={googleButtonText}
                icon={<GoogleIcon />}
                variant="outline"
              />
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ou connectez-vous avec votre email
                </span>
              </div>
            </div>
            <PasswordLoginForm />
          </div>
        </CardContent>
      </Card>

      <div className="text-balance text-center text-xs text-muted-foreground [&_a]">
        En cliquant sur continuer, vous acceptez les conditions d&apos;utilisation et la
        politique de confidentialité de JobVert.
      </div>

      {bottomSlot ? (
        <div className="text-center text-sm text-muted-foreground [&_a]">
          {bottomSlot}
        </div>
      ) : null}
    </div>
  );
}

            
        