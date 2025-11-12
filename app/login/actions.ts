"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/app/utils/auth";

export type EmailSignInState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const emailSchema = z.object({
  email: z
    .string({ required_error: "L'adresse mail est obligatoire." })
    .trim()
    .email("Veuillez entrer une adresse mail valide."),
});

export async function requestEmailSignIn(
  _prevState: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  try {
    const validated = emailSchema.parse({ email: formData.get("email") });

    const result = await signIn("resend", {
      email: validated.email,
      redirect: false,
      redirectTo: "/onboarding",
    });

    if (result?.error) {
      return {
        status: "error",
        message:
          "Impossible d'envoyer le lien de connexion. Veuillez réessayer dans quelques instants.",
      };
    }

    return {
      status: "success",
      message:
        "Un lien de connexion vous a été envoyé. Pensez à vérifier vos spams si vous ne le voyez pas dans quelques minutes.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues.at(0);
      return {
        status: "error",
        message: firstIssue?.message ?? "Veuillez entrer une adresse mail valide.",
      };
    }

    if (error instanceof AuthError) {
      return {
        status: "error",
        message:
          "Impossible d'envoyer le lien de connexion. Veuillez réessayer dans quelques instants.",
      };
    }

    return {
      status: "error",
      message: "Une erreur inattendue est survenue. Veuillez réessayer.",
    };
  }
}