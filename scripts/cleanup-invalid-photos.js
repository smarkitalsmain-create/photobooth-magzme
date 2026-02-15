/**
 * One-time cleanup script: Delete photos with invalid blob URLs
 * 
 * Usage:
 *   node scripts/cleanup-invalid-photos.js
 * 
 * This script:
 * - Finds photos where blobUrl is NULL, empty, or NOT from Vercel Blob
 * - Deletes them from the database
 * - Prints the count of deleted photos
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

async function cleanupInvalidPhotos() {
  try {
    console.log("Checking for photos with invalid blob URLs...");

    // Find photos with invalid blob URLs
    const invalidPhotos = await prisma.photo.findMany({
      where: {
        OR: [
          { blobUrl: null },
          { blobUrl: "" },
          { NOT: { blobUrl: { contains: "vercel-storage.com" } } },
        ],
      },
      select: {
        id: true,
        blobUrl: true,
        originalName: true,
        createdAt: true,
      },
    });

    const count = invalidPhotos.length;

    if (count === 0) {
      console.log("✓ No photos with invalid blob URLs found. Nothing to clean up.");
      return;
    }

    console.log(`\nFound ${count} photo(s) with invalid blob URLs:`);
    invalidPhotos.forEach((photo) => {
      console.log(`  - ${photo.id} (${photo.originalName})`);
      console.log(`    blobUrl: ${photo.blobUrl || "NULL"}`);
      console.log(`    Created: ${photo.createdAt}`);
    });

    console.log("\n⚠️  WARNING: This will permanently delete these photos from the database.");
    console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...");
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete photos with invalid blob URLs
    const result = await prisma.photo.deleteMany({
      where: {
        OR: [
          { blobUrl: null },
          { blobUrl: "" },
          { NOT: { blobUrl: { contains: "vercel-storage.com" } } },
        ],
      },
    });

    console.log(`\n✓ Successfully deleted ${result.count} photo(s) with invalid blob URLs.`);
    console.log("  Note: This only deletes database records, not blob storage files.");
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupInvalidPhotos();
