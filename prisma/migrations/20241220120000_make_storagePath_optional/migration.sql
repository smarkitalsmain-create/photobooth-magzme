-- Make storagePath optional (legacy field, not used in Vercel deployment)
-- This drops the NOT NULL constraint to allow NULL values
-- No data deletion

ALTER TABLE "photos" ALTER COLUMN "storagePath" DROP NOT NULL;
