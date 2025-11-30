import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserType } from "@prisma/client";
import { prisma } from "./db";
import {
  emailFromAddress,
  ensureResendClient,
  resendApiKey,
} from "./email";
import { verifyPassword } from "./password";
import { z } from "zod";


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

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type TokenWithFlags = {
  onboardingCompleted?: boolean;
  userType?: UserType | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
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
    Credentials({
      credentials: {
        email: { label: "Adresse mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
          const { email, password } = parsed.data;
          const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.password) {
          return null;
        }
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
          return null;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const enrichedToken = token as typeof token & TokenWithFlags;

      if (user) {
        enrichedToken.id = user.id;
        enrichedToken.onboardingCompleted = user.onboardingCompleted;
        enrichedToken.userType = user.userType;
        return enrichedToken;
      }
      if (enrichedToken.sub && enrichedToken.onboardingCompleted === undefined) {
          const existingUser = await prisma.user.findUnique({
          where: { id: enrichedToken.sub },
          select: {
            onboardingCompleted: true,
            userType: true,
          },
        });

        if (existingUser) {
          enrichedToken.onboardingCompleted = existingUser.onboardingCompleted;
          enrichedToken.userType = existingUser.userType;
        }
      }

      return enrichedToken;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      const enrichedToken = token as typeof token & TokenWithFlags;

      if (token.sub) {
        session.user.id = token.sub;
      }

      session.user.onboardingCompleted = enrichedToken.onboardingCompleted ?? false;
      session.user.userType = enrichedToken.userType ?? null;
      return session;
    },
  },
});