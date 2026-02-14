/**
 * Cleanup script: Delete photos where blobUrl is NULL
 * 
 * Usage:
 *   DATABASE_URL="your-neon-connection-string" node scripts/cleanup-null-bloburl.mjs
 * 
 * This script:
 * - Finds all photos where blobUrl IS NULL
 * - Deletes them from the database
 * - Prints the count of deleted photos
 * - Does NOT delete files from blob storage (only DB records)
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

async function cleanupNullBlobUrl() {
  try {
    console.log("Checking for photos with NULL blobUrl...");

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

    console.log(`Found ${count} photo(s) with NULL blobUrl:`);
    photosWithNullUrl.forEach((photo) => {
      console.log(`  - ${photo.id} (${photo.originalName}) - Created: ${photo.createdAt}`);
    });

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

cleanupNullBlobUrl();
