/**
 * One-time cleanup script: Delete photos where blobUrl is NULL
 * 
 * Usage:
 *   node scripts/cleanup-legacy-photos.js
 * 
 * This script:
 * - Finds all photos where blobUrl IS NULL
 * - Optionally checks if a 'url' column exists and backfills from it
 * - Deletes photos with NULL blobUrl (or backfills if url exists)
 * - Prints the count of affected photos
 * 
 * WARNING: This is a destructive operation. Run manually only.
 * Do NOT run automatically on deploy.
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

async function cleanupLegacyPhotos() {
  try {
    console.log("Checking for photos with NULL blobUrl...");

    // First, try to backfill from 'url' column if it exists
    try {
      const backfillResult = await prisma.$executeRaw`
        UPDATE photos
        SET "blobUrl" = url
        WHERE "blobUrl" IS NULL
        AND url IS NOT NULL
        AND url != ''
      `;

      if (backfillResult > 0) {
        console.log(`✓ Backfilled ${backfillResult} photo(s) from 'url' column to 'blobUrl'.`);
      }
    } catch (error) {
      // If 'url' column doesn't exist, that's fine - continue with deletion
      if (error.message && error.message.includes("column") && error.message.includes("url")) {
        console.log("  (No 'url' column found - skipping backfill)");
      } else {
        throw error;
      }
    }

    // Find all photos with NULL blobUrl
    const photosWithNullUrl = await prisma.photo.findMany({
      where: {
        blobUrl: null,
      },
      select: {
        id: true,
        originalName: true,
        createdAt: true,
      },
    });

    const count = photosWithNullUrl.length;

    if (count === 0) {
      console.log("✓ No photos with NULL blobUrl found. Nothing to clean up.");
      return;
    }

    console.log(`\nFound ${count} photo(s) with NULL blobUrl:`);
    photosWithNullUrl.forEach((photo) => {
      console.log(`  - ${photo.id} (${photo.originalName}) - Created: ${photo.createdAt}`);
    });

    console.log("\n⚠️  WARNING: This will permanently delete these photos from the database.");
    console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...");
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete photos with NULL blobUrl
    const result = await prisma.photo.deleteMany({
      where: {
        blobUrl: null,
      },
    });

    console.log(`\n✓ Successfully deleted ${result.count} photo(s) with NULL blobUrl.`);
    console.log("  Note: This only deletes database records, not blob storage files.");
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupLegacyPhotos();
