import { randomBytes } from "crypto";
import { prisma } from "@/app/utils/db";
import {
  emailFromAddress,
  ensureResendClient,
  getApplicationBaseUrl,
} from "@/app/utils/email";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function buildPasswordResetEmailHtml(url: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h1 style="font-size: 20px;">Rinitialisez votre mot de passe JobVert</h1>
      <p>Nous avons recu une demande de reinitialisation de mot de passe pour votre compte JobVert.</p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 20px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Choisir un nouveau mot de passe
        </a>
      </p>
      <p style="font-size: 12px; color: #475569;">Ce lien expirera dans 1 heure. Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
    </div>
  `;
}

function buildPasswordResetEmailText(url: string) {
  return `Reinitialisez votre mot de passe JobVert\n\nCliquez sur le lien suivant pour choisir un nouveau mot de passe :\n${url}\n\nCe lien expirera dans 1 heure.\n\nSi vous n'etes pas a l'origine de cette demande, ignorez simplement ce message.`;
}

export async function createPasswordResetToken(userId: string) {
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  return prisma.passwordResetToken.create({
    data: {
      userId,
      token: randomBytes(32).toString("hex"),
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resend = ensureResendClient();
  const resetUrl = `${getApplicationBaseUrl()}/reset-password/${token}`;

  const { error } = await resend.emails.send({
    from: emailFromAddress,
    to: email,
    subject: "Reinitialisez votre mot de passe JobVert",
    html: buildPasswordResetEmailHtml(resetUrl),
    text: buildPasswordResetEmailText(resetUrl),
  });

  if (error) {
    throw error;
  }
}
