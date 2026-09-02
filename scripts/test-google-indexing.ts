import {
  notifyGoogleIndexing,
  validateGoogleIndexingJobUrl,
} from "../lib/google-indexing.ts";

async function main() {
  const [url, ...extraArguments] = process.argv.slice(2);

  if (!url || extraArguments.length > 0) {
    throw new Error(
      "Usage: npm run google:indexing:test -- https://jobvert.fr/job/un-slug"
    );
  }

  const validatedUrl = validateGoogleIndexingJobUrl(url).toString();
  const result = await notifyGoogleIndexing(validatedUrl, "URL_UPDATED");

  if (!result) {
    console.log(
      "Google Indexing is disabled; no request was sent. Set GOOGLE_INDEXING_ENABLED=true to run a real test."
    );
    return;
  }

  console.log(`Google Indexing status: ${result.status}`);
}

main().catch((error) => {
  console.error(
    `Google Indexing test failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`
  );
  process.exitCode = 1;
});
