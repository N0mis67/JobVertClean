import Image from "next/image";
import Link from "next/link";
import leaf from "@/public/leaf.png";
import { LoginForm } from "@/components/forms/LoginForm";

export default function Register() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-6 ">
        <Link href="/" className="flex items-center gap-2 self-center">
          <Image src={leaf} alt="Logo" className="size-10" />
          <h1 className="text-2xl font-bold">
            Job<span className="text-primary">Vert</span>
          </h1>
        </Link>

        <LoginForm
          title="Créez votre compte JobVert"
          description="Recevez un lien sécurisé par e-mail ou continuez avec Google pour accéder à la plateforme."
          googleButtonText="Créer un compte avec Google"
          emailSubmitText="Créer un compte avec mon e-mail"
          bottomSlot={
            <>
              Vous avez déjà un compte ?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Connectez-vous
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}