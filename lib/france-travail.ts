export const FRANCE_TRAVAIL_SOURCE = "FRANCE_TRAVAIL";

const FRANCE_TRAVAIL_JOB_URL_BASE =
  "https://candidat.francetravail.fr/offres/recherche/detail/";
const FRANCE_TRAVAIL_EXTERNAL_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

export function normalizeFranceTravailExternalId(
  externalId: string | null | undefined
): string | null {
  const normalized = externalId?.trim();

  if (
    !normalized ||
    normalized.length > 64 ||
    !FRANCE_TRAVAIL_EXTERNAL_ID_PATTERN.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function getFranceTravailJobUrl(
  externalId: string | null | undefined
): string | null {
  const normalizedExternalId = normalizeFranceTravailExternalId(externalId);

  if (!normalizedExternalId) {
    return null;
  }

  return `${FRANCE_TRAVAIL_JOB_URL_BASE}${encodeURIComponent(
    normalizedExternalId
  )}`;
}

export function canonicalizeFranceTravailImport(
  externalId: string | null | undefined
): { externalId: string; externalUrl: string } | null {
  const normalizedExternalId = normalizeFranceTravailExternalId(externalId);
  const externalUrl = getFranceTravailJobUrl(normalizedExternalId);

  if (!normalizedExternalId || !externalUrl) {
    return null;
  }

  return {
    externalId: normalizedExternalId,
    externalUrl,
  };
}

export type JobApplicationAction =
  | { kind: "native"; href: string }
  | { kind: "external"; href: string }
  | { kind: "unavailable" };

export function getJobApplicationAction(
  job: {
    externalSource: string | null;
    externalId: string | null;
    externalUrl: string | null;
  },
  nativeHref: string
): JobApplicationAction {
  if (job.externalSource !== FRANCE_TRAVAIL_SOURCE) {
    return { kind: "native", href: nativeHref };
  }

  const canonicalUrl = getFranceTravailJobUrl(job.externalId);

  if (!canonicalUrl) {
    return { kind: "unavailable" };
  }

  // Never trust an arbitrary persisted external URL. Imports and the backfill
  // store this same canonical value, while this fallback keeps legacy rows safe.
  return {
    kind: "external",
    href: job.externalUrl === canonicalUrl ? job.externalUrl : canonicalUrl,
  };
}
