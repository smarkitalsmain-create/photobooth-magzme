/**
 * One-time backfill script: Copy url -> blobUrl for legacy photos
 * 
 * Usage:
 *   node scripts/backfill-bloburl.js
 * 
 * This script:
 * - Finds photos where blobUrl IS NULL but url IS NOT NULL (if url column exists)
 * - Copies url value to blobUrl
 * - Prints the count of updated photos
 * 
 * WARNING: This is a one-time operation. Run manually only.
 * 
 * Note: If your schema doesn't have a "url" column, this script will do nothing.
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load env vars (same logic as run-prisma.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

const rootEnvPath = join(repoRoot, ".env");
const serverEnvPath = join(repoRoot, "server", ".env");

if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}

const prisma = new PrismaClient();

async function backfillBlobUrl() {
  try {
    console.log("Checking for photos with NULL blobUrl but existing url...");

    // First, check if we can query the url field directly
    // If the schema doesn't have url, this will fail gracefully
    try {
      // Use raw SQL to check if url column exists and has data
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM photos
        WHERE blobUrl IS NULL
        AND url IS NOT NULL
        AND url != ''
      `;

      const count = Number(result[0]?.count || 0);

      if (count === 0) {
        console.log("✓ No photos found with NULL blobUrl but existing url.");
        console.log("  (This is normal if the 'url' column doesn't exist or has no data)");
        return;
      }

      console.log(`Found ${count} photo(s) to backfill.`);

      // Update photos: copy url -> blobUrl
      const updateResult = await prisma.$executeRaw`
        UPDATE photos
        SET blobUrl = url
        WHERE blobUrl IS NULL
        AND url IS NOT NULL
        AND url != ''
      `;

      console.log(`\n✓ Successfully updated ${updateResult} photo(s).`);
      console.log("  blobUrl now contains the value from url column.");
    } catch (error) {
      // If url column doesn't exist, Prisma will throw an error
      if (error.message && error.message.includes("column") && error.message.includes("url")) {
        console.log("✓ No 'url' column found in database schema.");
        console.log("  This script only works if your schema has both 'url' and 'blobUrl' columns.");
        console.log("  If you only have 'blobUrl', no backfill is needed.");
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backfillBlobUrl();
