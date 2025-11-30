import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { prisma } from "./db";
import {
  emailFromAddress,
  ensureResendClient,
  resendApiKey,
} from "./email";

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

type RedirectCallbackParams = Parameters<
  NonNullable<NonNullable<NextAuthConfig["callbacks"]>["redirect"]>
>[0] & {
  token?: { email?: string | null } | null;
  user?: { id?: string | null } | null;
};

export const authBaseConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ResendProvider({
      apiKey: resendApiKey ?? "",
      from: emailFromAddress,
      maxAge: 10 * 60,
      async sendVerificationRequest({ identifier, url }) {
        const resend = ensureResendClient();

        const { error } = await resend.emails.send({
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
  callbacks: {
    async session({ session, user }) {
      if (!session.user) {
        return session;
      }

      if (user) {
        session.user.id = user.id;
        session.user.onboardingCompleted = (
          (user as { onboardingCompleted?: boolean }).onboardingCompleted ??
          false
        );
        return session;
      }

      if (!session.user.email && !session.user.id) {
        return session;
      }

      const existingUser = await prisma.user.findUnique({
        where: session.user.id
          ? { id: session.user.id }
          : { email: session.user.email! },
        select: { id: true, onboardingCompleted: true },
      });

      if (existingUser) {
        session.user.id = existingUser.id;
        session.user.onboardingCompleted = existingUser.onboardingCompleted;
      }

      return session;
    },
    async redirect({ url, baseUrl, token, user }: RedirectCallbackParams) {
      let onboardingCompleted: boolean | null = null;

      if (token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { onboardingCompleted: true },
        });

        onboardingCompleted = dbUser?.onboardingCompleted ?? null;
      } else if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { onboardingCompleted: true },
        });

        onboardingCompleted = dbUser?.onboardingCompleted ?? null;
      }

      if (onboardingCompleted === false) {
        return `${baseUrl}/onboarding`;
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      try {
        const parsedUrl = new URL(url);

        if (parsedUrl.origin === baseUrl) {
          return parsedUrl.toString();
        }
      } catch {
        // ignore invalid URLs
      }

      return baseUrl;
    },
  },
};