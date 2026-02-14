-- Make blobUrl required (NOT NULL)
-- IMPORTANT: Ensure all existing rows have blobUrl values before running this migration
-- If there are NULL values, this migration will fail - backfill them first

ALTER TABLE "photos" ALTER COLUMN "blobUrl" SET NOT NULL;
