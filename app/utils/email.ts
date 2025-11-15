import { Resend } from "resend";

export const resendApiKey = process.env.RESEND_API_KEY;

export const resendClient =
  resendApiKey !== undefined ? new Resend(resendApiKey) : undefined;

export const emailFromAddress =
  process.env.AUTH_EMAIL_FROM ?? "JobVert <onboarding@resend.dev>";

export function ensureResendClient() {
  if (!resendClient) {
    throw new Error(
      "RESEND_API_KEY doit être défini pour envoyer des emails transactionnels.",
    );
  }

  return resendClient;
}

export function getApplicationBaseUrl() {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.AUTH_BASE_URL) {
    return process.env.AUTH_BASE_URL;
  }

  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}