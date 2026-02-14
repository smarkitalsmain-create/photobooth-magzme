/**
 * GET /api/photos/list
 * List photos (public API)
 * Returns JSON: { photos: [...] }
 */

export const config = { runtime: "nodejs" };

import { prisma } from "../_lib/prisma.js";

export default async function handler(req) {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Hard check: DATABASE_URL required
    if (!process.env.DATABASE_URL) {
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") || "100", 10) || 100, 200);
    const skip = parseInt(new URL(req.url).searchParams.get("skip") || "0", 10) || 0;

    // Get photos from database
    let photos = [];
    try {
      photos = await prisma.photo.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true,
          blobUrl: true,
          // Include url for backward compatibility (derived from blobUrl)
        },
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Format photos with url field (use blobUrl as primary)
    const formattedPhotos = photos.map((photo) => ({
      id: photo.id,
      originalName: photo.originalName,
      mimeType: photo.mimeType,
      size: photo.size,
      createdAt: photo.createdAt,
      blobUrl: photo.blobUrl,
      url: photo.blobUrl || null, // Use blobUrl as url for compatibility
    }));

    return new Response(
      JSON.stringify({ photos: formattedPhotos }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in photos list handler:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
