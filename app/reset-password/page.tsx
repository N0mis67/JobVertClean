import Image from "next/image";
import Link from "next/link";
import leaf from "@/public/leaf.png";
import { PasswordResetRequestForm } from "@/components/forms/PasswordResetRequestForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PasswordResetRequestPage() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center">
          <Image src={leaf} alt="Logo" className="size-10" />
          <h1 className="text-2xl font-bold">
            Job<span className="text-primary">Vert</span>
          </h1>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Mot de passe oublie ?</CardTitle>
            <CardDescription>
              Entrez votre adresse mail pour recevoir un lien de
              reinitialisation securise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordResetRequestForm />
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground [&_a]">
          Vous vous souvenez de votre mot de passe ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Revenez a la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
