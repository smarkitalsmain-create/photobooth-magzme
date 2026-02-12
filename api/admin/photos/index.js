/**
 * GET /api/admin/photos
 * Photo management page with list (protected by Basic Auth)
 * Serverless-safe: uses only DB + blobUrl, no filesystem
 */

export const config = { runtime: "nodejs" };

import { checkBasicAuthSync } from "../../_lib/basicAuth.js";
import { prisma } from "../../_lib/prisma.js";
import { renderPhotosList } from "../../_lib/render.js";

export default async function handler(req) {
  try {
    if (req.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Hard check: ADMIN_USER and ADMIN_PASS required for auth
    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
      const missing = [];
      if (!process.env.ADMIN_USER) missing.push("ADMIN_USER");
      if (!process.env.ADMIN_PASS) missing.push("ADMIN_PASS");
      return new Response(`Missing required environment variables: ${missing.join(", ")}`, {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Hard check: DATABASE_URL required for this route (uses Prisma)
    if (!process.env.DATABASE_URL) {
      return new Response("Missing DATABASE_URL", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Check Basic Auth (synchronous)
    const authResult = checkBasicAuthSync(req);
    if (!authResult.authorized) {
      return new Response(authResult.message || "Unauthorized", {
        status: authResult.status || 401,
        headers: {
          "Content-Type": "text/plain",
          "WWW-Authenticate": 'Basic realm="Admin"',
          "X-Admin-Alive": "true",
        },
      });
    }

    // Parse query parameters safely
    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      console.error("Invalid URL:", err);
      return new Response("Invalid request URL", {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50), 200);
    const searchQuery = url.searchParams.get("q")?.trim() || null;
    const skip = (page - 1) * limit;

    // Build where clause for search
    const where = searchQuery
      ? {
          originalName: {
            contains: searchQuery,
            mode: "insensitive",
          },
        }
      : {};

    // Get photos from database (handle empty DB gracefully)
    let photos = [];

    try {
      photos = await prisma.photo.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      });
    } catch (dbError) {
      console.error("DB error:", dbError);
      return new Response("DB error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Ensure photos is always an array
    if (!Array.isArray(photos)) {
      photos = [];
    }

    // Get total count for pagination
    let total = 0;
    try {
      total = await prisma.photo.count({ where });
    } catch (dbError) {
      console.error("DB count error:", dbError);
      // Continue with total = 0 if count fails
      total = 0;
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const pagination = {
      page,
      limit,
      total: total || 0,
      totalPages,
    };

    const html = renderPhotosList(photos, pagination, searchQuery);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "X-Admin-Alive": "true",
      },
    });
  } catch (error) {
    console.error("Error in admin photos handler:", error);
    return new Response("Admin function failed", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "X-Admin-Alive": "true",
      },
    });
  }
}
