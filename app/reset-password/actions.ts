"use server";

import { z } from "zod";
import { prisma } from "@/app/utils/db";
import { hashPassword } from "@/app/utils/password";
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
} from "@/app/utils/password-reset";

export type PasswordResetRequestState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type PasswordResetState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .nonempty("L'adresse mail est obligatoire.")
    .email("Veuillez entrer une adresse mail valide."),
});

const passwordResetSchema = z
  .object({
    token: z.string().trim().nonempty("Le lien de reinitialisation est invalide."),
    password: z
      .string()
      .nonempty("Le mot de passe est obligatoire.")
      .min(8, "Votre mot de passe doit contenir au moins 8 caracteres."),
    confirmPassword: z
      .string()
      .nonempty("Merci de confirmer votre mot de passe."),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirmPassword"],
      });
    }
  });

const resetRequestSuccessMessage =
  "Si un compte existe pour cette adresse mail, un lien de reinitialisation a ete envoye.";

export async function requestPasswordReset(
  _prevState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  try {
    const validated = passwordResetRequestSchema.parse({
      email: formData.get("email"),
    });

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true, email: true, password: true },
    });

    if (!user?.password) {
      return {
        status: "success",
        message: resetRequestSuccessMessage,
      };
    }

    const resetToken = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, resetToken.token);

    return {
      status: "success",
      message: resetRequestSuccessMessage,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues.at(0);
      return {
        status: "error",
        message: firstIssue?.message ?? "Veuillez entrer une adresse mail valide.",
      };
    }

    return {
      status: "error",
      message:
        error instanceof Error &&
        error.message ===
          "RESEND_API_KEY doit Ãªtre dÃ©fini pour envoyer des emails transactionnels."
          ? "Le service d'envoi d'emails n'est pas configure. Contactez l'equipe JobVert."
          : "Impossible d'envoyer le lien de reinitialisation pour le moment. Veuillez reessayer.",
    };
  }
}

export async function resetPassword(
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  let validated: z.infer<typeof passwordResetSchema>;

  try {
    validated = passwordResetSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues.at(0);
      return {
        status: "error",
        message:
          firstIssue?.message ?? "Veuillez verifier les informations saisies.",
      };
    }

    return {
      status: "error",
      message: "Impossible de reinitialiser votre mot de passe.",
    };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: validated.token },
    select: {
      id: true,
      expires: true,
      userId: true,
    },
  });

  if (!resetToken) {
    return {
      status: "error",
      message: "Ce lien de reinitialisation est invalide ou a deja ete utilise.",
    };
  }

  if (resetToken.expires < new Date()) {
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return {
      status: "error",
      message: "Ce lien de reinitialisation a expire. Demandez-en un nouveau.",
    };
  }

  const hashedPassword = await hashPassword(validated.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  return {
    status: "success",
    message:
      "Votre mot de passe a ete mis a jour. Vous pouvez maintenant vous connecter.",
  };
}
