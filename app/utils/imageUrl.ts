const ALLOWED_IMAGE_HOSTNAMES = [
  "ufs.sh",
  "utfs.io",
  "res.cloudinary.com",
  "avatar.vercel.sh",
];

function isAllowedHostname(hostname: string) {
  return (
    ALLOWED_IMAGE_HOSTNAMES.includes(hostname) || hostname.endsWith(".ufs.sh")
  );
}

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "https:" && isAllowedHostname(parsedUrl.hostname);
  } catch {
    return false;
  }
}

export function getCompanyLogoFallback(name: string): string {
  const safeName = name.trim() || "Entreprise";

  return `https://avatar.vercel.sh/${encodeURIComponent(safeName)}?size=120`;
}

export function getSafeCompanyLogoUrl(
  src: string | null | undefined,
  name: string
): string {
  const trimmedSrc = src?.trim();

  if (!trimmedSrc || !isAllowedImageUrl(trimmedSrc)) {
    return getCompanyLogoFallback(name);
  }

  return trimmedSrc;
}
