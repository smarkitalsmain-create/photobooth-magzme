/**
 * POST /api/admin/photos/[id]/delete
 * Delete photo (protected by Basic Auth)
 * Serverless-safe: deletes from DB and Blob only, no filesystem
 */

export const config = { runtime: "nodejs" };

import { checkBasicAuthSync } from "../../../_lib/basicAuth.js";
import { prisma } from "../../../_lib/prisma.js";
import { del } from "@vercel/blob";

export default async function handler(req, context) {
  try {
    if (req.method !== "POST") {
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

    // Hard check: DATABASE_URL required
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

    // Get ID from URL or context params
    let id;
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      id = context?.params?.id || pathParts[pathParts.length - 1];
    } catch (err) {
      console.error("Error parsing URL:", err);
      return new Response("Invalid request URL", {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    if (!id || typeof id !== "string") {
      return new Response("Photo ID required", {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Fetch photo from database
    let photo;
    try {
      photo = await prisma.photo.findUnique({
        where: { id },
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return new Response("DB error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    if (!photo) {
      return new Response("Photo not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Delete blob from Vercel Blob if blobUrl exists (no filesystem access)
    if (photo.blobUrl && typeof photo.blobUrl === "string" && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(photo.blobUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (blobError) {
        // Log but continue with DB deletion
        console.warn("Error deleting blob (continuing with DB deletion):", blobError);
      }
    }

    // Delete from database only (no filesystem deletion)
    try {
      await prisma.photo.delete({
        where: { id },
      });
    } catch (dbError) {
      console.error("Database delete error:", dbError);
      return new Response("DB error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Redirect back to photos list
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/photos?deleted=1",
        "X-Admin-Alive": "true",
      },
    });
  } catch (error) {
    console.error("Error in delete handler:", error);
    return new Response("Admin function failed", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "X-Admin-Alive": "true",
      },
    });
  }
}
