/**
 * Backfill script for photos with NULL blobUrl
 * 
 * Usage:
 *   DATABASE_URL="your-neon-connection-string" node scripts/backfill-photos.js
 * 
 * This script:
 * - Finds all photos where blobUrl IS NULL
 * - Sets blobUrl to "MISSING_BLOB_URL" placeholder
 * - Logs the count of updated rows
 * - Does NOT delete or guess URLs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillPhotos() {
  try {
    console.log("Starting backfill of photos with NULL blobUrl...");

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
      console.log("✓ No photos with NULL blobUrl found. Nothing to backfill.");
      return;
    }

    console.log(`Found ${count} photo(s) with NULL blobUrl:`);
    photosWithNullUrl.forEach((photo) => {
      console.log(`  - ${photo.id} (${photo.originalName}) - Created: ${photo.createdAt}`);
    });

    // Update all NULL blobUrl values to placeholder
    const result = await prisma.photo.updateMany({
      where: {
        blobUrl: null,
      },
      data: {
        blobUrl: "MISSING_BLOB_URL",
      },
    });

    console.log(`\n✓ Successfully updated ${result.count} photo(s) with placeholder blobUrl.`);
    console.log("  Placeholder value: 'MISSING_BLOB_URL'");
    console.log("\nNext steps:");
    console.log("  1. Review the updated photos");
    console.log("  2. Run: npx prisma migrate dev --name make_bloburl_required");
    console.log("  3. This will make blobUrl required again");
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backfillPhotos();
