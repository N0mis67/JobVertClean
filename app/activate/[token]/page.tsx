import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/app/utils/db";

async function activateAccount(token: string) {
  if (!token) {
    return {
      status: "error" as const,
      title: "Lien invalide",
      description:
        "Le lien d'activation n'est pas valide. Demandez un nouveau lien ou contactez notre équipe.",
      action: { href: "/register", label: "Retour à l'inscription" },
    };
  }

  const verificationToken = await prisma.verificationToken.findFirst({
    where: { token },
  });

  if (!verificationToken) {
    return {
      status: "error" as const,
      title: "Lien invalide",
      description:
        "Ce lien d'activation n'existe plus. Demandez un nouveau lien depuis la page de connexion.",
      action: { href: "/login", label: "Demander un nouveau lien" },
    };
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return {
      status: "error" as const,
      title: "Lien expiré",
      description:
        "Ce lien d'activation a expiré. Demandez un nouveau lien depuis la page de connexion.",
      action: { href: "/login", label: "Demander un nouveau lien" },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: verificationToken.identifier },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return {
      status: "error" as const,
      title: "Compte introuvable",
      description:
        "Nous n'avons pas trouvé de compte associé à ce lien. Essayez de créer un nouveau compte.",
      action: { href: "/register", label: "Créer un compte" },
    };
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
      },
    },
  });

  return {
    status: "success" as const,
    title: "Compte activé",
    description:
      "Votre adresse mail a été confirmée. Vous pouvez maintenant vous connecter avec vos identifiants.",
    action: { href: "/login", label: "Se connecter" },
  };
}

export default async function ActivatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await activateAccount(token);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{result.title}</CardTitle>
          <CardDescription>{result.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={result.action.href}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {result.action.label}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}