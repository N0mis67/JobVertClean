import Link from "next/link";
import { PasswordResetForm } from "@/components/forms/PasswordResetForm";
import { prisma } from "@/app/utils/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function getResetTokenStatus(token: string) {
  if (!token) {
    return {
      valid: false,
      title: "Lien invalide",
      description:
        "Le lien de reinitialisation n'est pas valide. Demandez-en un nouveau depuis la page de connexion.",
    };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { id: true, expires: true },
  });

  if (!resetToken) {
    return {
      valid: false,
      title: "Lien invalide",
      description:
        "Ce lien de reinitialisation n'existe plus ou a deja ete utilise.",
    };
  }

  if (resetToken.expires < new Date()) {
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return {
      valid: false,
      title: "Lien expire",
      description:
        "Ce lien de reinitialisation a expire. Demandez-en un nouveau pour choisir un autre mot de passe.",
    };
  }

  return {
    valid: true,
    title: "Choisissez un nouveau mot de passe",
    description:
      "Entrez un nouveau mot de passe pour securiser votre compte JobVert.",
  };
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getResetTokenStatus(token);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{result.title}</CardTitle>
          <CardDescription>{result.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {result.valid ? (
            <PasswordResetForm token={token} />
          ) : (
            <div className="text-center">
              <Link
                href="/reset-password"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Demander un nouveau lien
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
