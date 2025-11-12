import { signIn } from "@/app/utils/auth";
import { EmailSignUpForm } from "./EmailSignUpForm";
import { GeneralSubmitButton } from "../general/SubmitButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { ReactNode, SVGProps } from "react";

type LoginFormProps = {
  title?: string;
  description?: string;
  googleButtonText?: string;
  emailSubmitText?: string;
  bottomSlot?: ReactNode;
};

const Google = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 256 262"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid"
    {...props}
  >
    <path
      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
      fill="#4285F4"
    />
    <path
      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
      fill="#34A853"
    />
    <path
      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
      fill="#FBBC05"
    />
    <path
      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
      fill="#EB4335"
    />
  </svg>
);

export function LoginForm({
  title = "Heureux de vous revoir",
  description = "Connectez-vous avec Google ou créez un compte avec votre adresse mail.",
  googleButtonText = "Continuer avec Google",
  emailSubmitText = "Continuer avec mon e-mail",
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
            <form
              action={async () => {
                "use server";
                await signIn("google", {
                  redirectTo: "/onboarding",
                });
              }}
              className="flex flex-col gap-4"
            >
              <GeneralSubmitButton
                text={googleButtonText}
                icon={<Google />}
                variant="outline"
              />
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <EmailSignUpForm submitLabel={emailSubmitText} />
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

            
        