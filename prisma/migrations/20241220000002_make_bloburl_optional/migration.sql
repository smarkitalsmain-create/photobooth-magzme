-- Make blobUrl optional (TEMPORARY - to unblock production)
-- This reverts the NOT NULL constraint to allow existing NULL values

ALTER TABLE "photos" ALTER COLUMN "blobUrl" DROP NOT NULL;

-- Remove the check constraint if it exists
ALTER TABLE "photos" DROP CONSTRAINT IF EXISTS "photos_blobUrl_not_empty";
