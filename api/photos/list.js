/**
 * GET /api/photos/list
 * List photos (public API)
 * Returns JSON: { photos: [...] } within a few seconds
 * Server-side safeguards: limit 200, order by newest, 405 for non-GET
 */

export const config = { runtime: "nodejs" };

import { prisma } from "../_lib/prisma.js";

// Timeout helper using Promise.race
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    ),
  ]);
}

export default async function handler(req) {
  try {
    // Return 405 for non-GET
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

    // Parse query parameters safely
    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid request URL" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Server-side safeguards: limit query size (take 200 max) and order by newest
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 200);
    const skip = Math.max(0, parseInt(url.searchParams.get("skip") || "0", 10) || 0);

    // Get photos from database with 8s timeout
    let photos = [];
    try {
      photos = await withTimeout(
        prisma.photo.findMany({
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
          },
        }),
        8000 // 8 second timeout
      );
    } catch (dbError) {
      console.error("Database error:", dbError);
      
      // Check if it was a timeout
      if (dbError.message === "Timeout") {
        return new Response(
          JSON.stringify({ error: "Database query timeout" }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
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
