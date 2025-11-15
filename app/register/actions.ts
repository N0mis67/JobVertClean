"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/app/utils/db";
import {
  emailFromAddress,
  ensureResendClient,
  getApplicationBaseUrl,
} from "@/app/utils/email";
import { hashPassword } from "@/app/utils/password";

export type RegisterState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const registerSchema = z
  .object({
    email: z
      .string({ required_error: "L'adresse mail est obligatoire." })
      .trim()
      .email("Veuillez entrer une adresse mail valide."),
    password: z
      .string({ required_error: "Le mot de passe est obligatoire." })
      .min(8, "Votre mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z
      .string({ required_error: "Merci de confirmer votre mot de passe." })
      .min(1, "Merci de confirmer votre mot de passe."),
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

function buildActivationEmailHtml(url: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h1 style="font-size: 20px;">Bienvenue sur JobVert</h1>
      <p>Merci de créer un compte avec votre adresse mail et un mot de passe. Pour finaliser votre inscription, confirmez votre adresse via le lien ci-dessous.</p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 20px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Activer mon compte
        </a>
      </p>
      <p style="font-size: 12px; color: #475569;">Ce lien expirera dans 24 heures. Si vous n'avez pas demandé cette inscription, vous pouvez ignorer cet e-mail.</p>
    </div>
  `;
}

function buildActivationEmailText(url: string) {
  return `Bienvenue sur JobVert !\n\nCliquez sur le lien suivant pour activer votre compte :\n${url}\n\nCe lien expirera dans 24 heures.\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message.`;
}

export async function registerWithPassword(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  let validated: z.infer<typeof registerSchema>;

  try {
    validated = registerSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues.at(0);
      return {
        status: "error",
        message: firstIssue?.message ?? "Veuillez vérifier les informations saisies.",
      };
    }

    return {
      status: "error",
      message: "Une erreur inattendue est survenue. Veuillez réessayer.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
    select: { id: true, password: true },
  });

  if (existingUser) {
    return {
      status: "error",
      message: "Cette adresse mail est déjà utilisée. Connectez-vous ou choisissez une autre adresse.",
    };
  }

  const hashedPassword = await hashPassword(validated.password);

  let createdUserId: string | null = null;

  try {
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        emailVerified: null,
      },
      select: {
        id: true,
        email: true,
      },
    });

    createdUserId = user.id;

    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    const token = randomBytes(32).toString("hex");

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const resend = ensureResendClient();
    const activationUrl = `${getApplicationBaseUrl()}/activate/${token}`;

    const { error } = await resend.emails.send({
      from: emailFromAddress,
      to: user.email,
      subject: "Activez votre compte JobVert",
      html: buildActivationEmailHtml(activationUrl),
      text: buildActivationEmailText(activationUrl),
    });

    if (error) {
      throw error;
    }

    return {
      status: "success",
      message: "Votre compte a été créé ! Consultez votre boîte mail pour confirmer votre adresse et activer votre accès.",
    };
  } catch (error) {
    if (createdUserId) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: validated.email },
      });

      await prisma.user
        .delete({ where: { id: createdUserId } })
        .catch(() => undefined);
    }

    return {
      status: "error",
      message:
        error instanceof Error && error.message === "RESEND_API_KEY doit être défini pour envoyer des emails transactionnels."
          ? "Le service d'envoi d'emails n'est pas configuré. Contactez l'équipe JobVert pour finaliser votre inscription."
          : "Impossible de finaliser l'inscription pour le moment. Veuillez réessayer dans quelques instants.",
    };
  }
}