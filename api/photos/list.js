/**
 * GET /api/photos/list
 * Fast, reliable photos list API
 * Always returns JSON, never hangs
 * 5s hard timeout guard
 */

export const config = { runtime: "nodejs" };

import prisma from "../_lib/prisma.js";

// Hard timeout guard (5 seconds)
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("PHOTO_LIST_TIMEOUT")), timeoutMs)
    ),
  ]);
}

export default async function handler(req) {
  try {
    // Return 405 for non-GET
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
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

    // Parse limit (default 50, max 100)
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || "50", 10) || 50),
      100
    );

    // Build Prisma query - select only id, url (from blobUrl), createdAt
    const queryOptions = {
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        blobUrl: true, // Will map to url in response
        createdAt: true,
      },
    };

    // Get photos from database with 5s hard timeout
    let photos = [];
    try {
      photos = await withTimeout(
        prisma.photo.findMany(queryOptions),
        5000 // 5 second timeout
      );
    } catch (dbError) {
      // Check if it was a timeout
      if (dbError.message === "PHOTO_LIST_TIMEOUT") {
        return new Response(
          JSON.stringify({ error: "PHOTO_LIST_TIMEOUT" }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ 
          error: "PHOTO_LIST_ERROR",
          message: dbError.message || "Database query failed"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Format items - only id, url (from blobUrl), createdAt
    const formattedItems = photos.map((photo) => ({
      id: photo.id,
      url: photo.blobUrl || null,
      createdAt: photo.createdAt,
    }));

    return new Response(
      JSON.stringify({ items: formattedItems }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in photos list handler:", error);
    return new Response(
      JSON.stringify({ 
        error: "PHOTO_LIST_ERROR",
        message: error.message || "Internal server error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
