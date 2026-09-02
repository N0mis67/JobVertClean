import "server-only";

import { JWT } from "google-auth-library";

const GOOGLE_INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const GOOGLE_INDEXING_ENDPOINT =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";
const DEFAULT_SITE_URL = "https://jobvert.fr";

export type GoogleIndexingNotificationType =
  | "URL_UPDATED"
  | "URL_DELETED";

export type GoogleIndexingResult = {
  status: number;
  data: unknown;
};

let jwtClient: JWT | undefined;

function isGoogleIndexingEnabled(): boolean {
  return process.env.GOOGLE_INDEXING_ENABLED === "true";
}

function getJwtClient(): JWT {
  if (jwtClient) {
    return jwtClient;
  }

  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY;

  if (!email || !rawPrivateKey) {
    throw new Error(
      "Google Indexing is enabled, but GOOGLE_INDEXING_CLIENT_EMAIL or GOOGLE_INDEXING_PRIVATE_KEY is missing."
    );
  }

  jwtClient = new JWT({
    email,
    key: rawPrivateKey.replace(/\\n/g, "\n"),
    scopes: [GOOGLE_INDEXING_SCOPE],
  });

  return jwtClient;
}

export function getJobUrl(slug: string): string {
  const normalizedSlug = slug.trim();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    throw new Error("A valid JobVert job slug is required.");
  }

  const siteUrl =
    process.env.GOOGLE_INDEXING_SITE_URL?.trim() || DEFAULT_SITE_URL;

  return new URL(`/job/${normalizedSlug}`, siteUrl).toString();
}

export function validateGoogleIndexingJobUrl(url: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Google Indexing URL must be a valid absolute URL.");
  }

  const isAllowedOrigin =
    parsedUrl.protocol === "https:" &&
    parsedUrl.hostname === "jobvert.fr" &&
    parsedUrl.port === "" &&
    parsedUrl.username === "" &&
    parsedUrl.password === "";
  const isIndividualJobPath = /^\/job\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    parsedUrl.pathname
  );

  if (
    !isAllowedOrigin ||
    !isIndividualJobPath ||
    parsedUrl.search !== "" ||
    parsedUrl.hash !== ""
  ) {
    throw new Error(
      "Google Indexing URL must match https://jobvert.fr/job/[slug]."
    );
  }

  return parsedUrl;
}

export async function notifyGoogleIndexing(
  url: string,
  type: GoogleIndexingNotificationType
): Promise<GoogleIndexingResult | null> {
  if (!isGoogleIndexingEnabled()) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Google Indexing] Disabled", { url, type });
    }

    return null;
  }

  if (type !== "URL_UPDATED" && type !== "URL_DELETED") {
    throw new Error("Unsupported Google Indexing notification type.");
  }

  const validatedUrl = validateGoogleIndexingJobUrl(url).toString();
  const client = getJwtClient();
  const response = await client.request({
    url: GOOGLE_INDEXING_ENDPOINT,
    method: "POST",
    timeout: 5_000,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      url: validatedUrl,
      type,
    },
  });

  return {
    status: response.status,
    data: response.data,
  };
}

export async function safeNotifyGoogleIndexing(
  url: string,
  type: GoogleIndexingNotificationType
): Promise<GoogleIndexingResult | null> {
  try {
    const result = await notifyGoogleIndexing(url, type);

    if (result) {
      console.info("[Google Indexing] Success", {
        url,
        type,
        status: result.status,
      });
    }

    return result;
  } catch (error) {
    console.error("[Google Indexing] Failed", {
      url,
      type,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return null;
  }
}

export async function safeNotifyGoogleIndexingForJob(
  slug: string,
  type: GoogleIndexingNotificationType
): Promise<GoogleIndexingResult | null> {
  try {
    return await safeNotifyGoogleIndexing(getJobUrl(slug), type);
  } catch (error) {
    console.error("[Google Indexing] Failed", {
      slug,
      type,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return null;
  }
}
