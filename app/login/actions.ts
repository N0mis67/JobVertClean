"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/app/utils/auth";

export type EmailSignInState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type PasswordLoginState =
  | { status: "idle" }
  | { status: "error"; message: string };

const emailSchema = z.object({
  email: z
    .string({ required_error: "L'adresse mail est obligatoire." })
    .trim()
    .toLowerCase()
    .email("Veuillez entrer une adresse mail valide."),
});

const passwordLoginSchema = z.object({
  email: z
    .string({ required_error: "L'adresse mail est obligatoire." })
    .trim()
    .toLowerCase()
    .email("Veuillez entrer une adresse mail valide."),
  password: z
    .string({ required_error: "Le mot de passe est obligatoire." })
    .min(1, "Le mot de passe est obligatoire."),
});

function getAuthErrorCauseMessage(error: AuthError): string | undefined {
  const cause = error.cause;

  if (cause instanceof Error) {
    return cause.message;
  }

  if (cause && typeof cause === "object" && "cause" in cause) {
    const nestedCause = (cause as { cause?: unknown }).cause;
    if (nestedCause instanceof Error) {
      return nestedCause.message;
    }
  }

  return undefined;
}

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

export async function loginWithPassword(
  _prevState: PasswordLoginState,
  formData: FormData,
): Promise<PasswordLoginState> {
  let validated: z.infer<typeof passwordLoginSchema>;

  try {
    validated = passwordLoginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues.at(0);
      return {
        status: "error",
        message: firstIssue?.message ?? "Veuillez vérifier vos identifiants.",
      };
    }

    return {
      status: "error",
      message: "Impossible de vous connecter. Veuillez réessayer.",
    };
  }

  try {
    const result = await signIn("credentials", {
      email: validated.email,
      password: validated.password,
      redirect: false,
      redirectTo: "/onboarding",
    });

    if (
      result &&
      typeof result === "object" &&
      "error" in result &&
      result.error
    ) {
      return {
        status: "error",
        message:
          result.error === "EMAIL_NOT_VERIFIED"
            ? "Veuillez confirmer votre adresse mail avant de vous connecter."
            : "Adresse mail ou mot de passe incorrect.",
      } satisfies PasswordLoginState;
    }

    redirect("/onboarding");
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        const causeMessage = getAuthErrorCauseMessage(error);

        if (causeMessage === "EMAIL_NOT_VERIFIED") {
          return {
            status: "error",
            message:
              "Veuillez confirmer votre adresse mail avant de vous connecter.",
          };
        }

        return {
          status: "error",
          message: "Adresse mail ou mot de passe incorrect.",
        };
      }

      return {
        status: "error",
        message: "Impossible de vous connecter. Veuillez réessayer.",
      };
    }

    throw error;
  }
}