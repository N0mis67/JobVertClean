-- Add slug column
ALTER TABLE "JobPost" ADD COLUMN "slug" TEXT;

-- Backfill existing records with deterministic slugs
WITH base AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(CONCAT_WS('-', "jobTitle", "location"), '[^[:alnum:]]+', '-', 'g'))),
        ''
      ),
      'job'
    ) AS base_slug
  FROM "JobPost"
), ranked AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY id) - 1 AS suffix
  FROM base
)
UPDATE "JobPost" AS job
SET "slug" = CASE
  WHEN ranked.suffix = 0 THEN ranked.base_slug
  ELSE ranked.base_slug || '-' || ranked.suffix::text
END
FROM ranked
WHERE ranked.id = job.id;

ALTER TABLE "JobPost" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "JobPost_slug_key" ON "JobPost"("slug");
