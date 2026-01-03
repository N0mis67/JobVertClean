"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/app/utils/auth";
import { prisma } from "@/app/utils/db";

export type EmailSignInState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type PasswordLoginState =
  | { status: "idle" }
  | { status: "error"; message: string };

  async function getPostLoginRedirect(email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      onboardingCompleted: true,
    },
  });

  if (!user) {
    return "/onboarding";
  }

  return user.onboardingCompleted ? "/" : "/onboarding";
}

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .nonempty("L'adresse mail est obligatoire.")
    .email("Veuillez entrer une adresse mail valide."),
});

const passwordLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .nonempty("L'adresse mail est obligatoire.")
    .email("Veuillez entrer une adresse mail valide."),
  password: z
    .string()
    .nonempty("Le mot de passe est obligatoire."),
});

function extractErrorFromRedirectUrl(value: string): string | null {
  const queryStart = value.indexOf("?");

  if (queryStart === -1) {
    return null;
  }

  const params = new URLSearchParams(value.slice(queryStart + 1));
  return params.get("error");
}

function toRelativeRedirect(value: string): string {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value.startsWith("/") ? value : "/onboarding";
  }
}

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

    // signIn can return a string or an object with a `url` property; handle both cases
    if (typeof result === "string") {
      const errorCode = extractErrorFromRedirectUrl(result);

      if (errorCode) {
        return {
          status: "error",
          message:
            errorCode === "CredentialsSignin"
              ? "Adresse mail ou mot de passe incorrect."
              : "Impossible de vous connecter. Veuillez réessayer.",
        };
      }

      redirect(toRelativeRedirect(result));
    }

    if (result && typeof result === "object" && "url" in result && result.url) {
      const errorCode = extractErrorFromRedirectUrl(result.url);

      if (errorCode) {
        return {
          status: "error",
          message:
            errorCode === "CredentialsSignin"
              ? "Adresse mail ou mot de passe incorrect."
              : "Impossible de vous connecter. Veuillez réessayer.",
        };
      }

      redirect(toRelativeRedirect(result.url));
    }

    const destination = await getPostLoginRedirect(validated.email);

    redirect(destination);
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