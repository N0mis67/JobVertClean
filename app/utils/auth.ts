import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { Resend } from "resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

const resendApiKey = process.env.RESEND_API_KEY;

const resendClient =
  resendApiKey !== undefined ? new Resend(resendApiKey) : undefined;

const emailFromAddress =
  process.env.AUTH_EMAIL_FROM ?? "JobVert <onboarding@resend.dev>";

function buildEmailHtml(url: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h1 style="font-size: 20px;">Bienvenue sur JobVert</h1>
      <p>Utilisez le lien ci-dessous pour confirmer votre adresse mail et finaliser la création de votre compte.</p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 20px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Confirmer mon adresse mail
        </a>
      </p>
      <p style="font-size: 12px; color: #475569;">Ce lien expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
    </div>
  `;
}

function buildEmailText(url: string) {
  return `Bienvenue sur JobVert !\n\nCliquez sur le lien suivant pour confirmer votre adresse mail et finaliser la création de votre compte :\n${url}\n\nCe lien expirera dans 10 minutes.`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    ResendProvider({
      apiKey: resendApiKey ?? "",
      from: emailFromAddress,
      maxAge: 10 * 60,
      async sendVerificationRequest({ identifier, url }) {
        if (!resendClient) {
          throw new Error(
            "RESEND_API_KEY doit être défini pour envoyer des liens de confirmation."
          );
        }

        const { error } = await resendClient.emails.send({
          from: emailFromAddress,
          to: identifier,
          subject: "Confirmez votre adresse mail JobVert",
          html: buildEmailHtml(url),
          text: buildEmailText(url),
        });

        if (error) {
          throw error;
        }
      },
    }),
    Google,
  ],
});