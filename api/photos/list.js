/**
 * GET /api/photos/list
 * List photos with cursor-based pagination
 * Returns JSON: { items: [...], nextCursor: <id|null> }
 * Always returns JSON, never HTML
 * 5s server-side timeout guard
 */

export const config = { runtime: "nodejs" };

import { prisma } from "../_lib/prisma.js";

// Timeout helper using Promise.race (5 seconds)
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
      return new Response(
        JSON.stringify({ error: "Method not allowed", details: "Only GET requests are supported" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
      });
    }

    // Hard check: DATABASE_URL required
    if (!process.env.DATABASE_URL) {
      return new Response(
        JSON.stringify({ 
          error: "Database not configured",
          details: "DATABASE_URL environment variable is missing"
        }),
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
        JSON.stringify({ error: "Invalid request URL", details: err.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse limit (default 50, max 200)
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || "50", 10) || 50),
      200
    );

    // Parse cursor (optional)
    const cursor = url.searchParams.get("cursor") || null;

    // Build Prisma query with cursor-based pagination
    const queryOptions = {
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      select: {
        id: true,
        originalName: true,
        blobUrl: true,
        size: true,
        createdAt: true,
      },
    };

    // Add cursor if provided
    if (cursor) {
      queryOptions.skip = 1; // Skip the cursor item itself
      queryOptions.cursor = { id: cursor };
    }

    // Get photos from database with 5s timeout
    let photos = [];
    try {
      photos = await withTimeout(
        prisma.photo.findMany(queryOptions),
        5000 // 5 second timeout
      );
    } catch (dbError) {
      console.error("Database error:", dbError);
      
      // Check if it was a timeout
      if (dbError.message === "Timeout") {
        return new Response(
          JSON.stringify({ 
            error: "Database query timeout",
            details: "Query exceeded 5 second limit"
          }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Database error",
          details: dbError.message || "Failed to query database"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Determine if there's a next page
    const hasNextPage = photos.length > limit;
    const items = hasNextPage ? photos.slice(0, limit) : photos;
    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].id : null;

    // Format items with url field (use blobUrl as primary)
    const formattedItems = items.map((photo) => ({
      id: photo.id,
      originalName: photo.originalName,
      url: photo.blobUrl || null,
      size: photo.size,
      createdAt: photo.createdAt,
    }));

    return new Response(
      JSON.stringify({ 
        items: formattedItems,
        nextCursor: nextCursor
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in photos list handler:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message || "An unexpected error occurred"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
