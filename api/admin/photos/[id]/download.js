/**
 * GET /api/admin/photos/[id]/download
 * Download photo as attachment (protected by Basic Auth)
 * Serverless-safe: fetches from blobUrl, no filesystem
 */

export const config = { runtime: "nodejs" };

import { checkBasicAuthSync } from "../../../_lib/basicAuth.js";
import { prisma } from "../../../_lib/prisma.js";

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== "string") {
    return "photo";
  }
  return filename
    .replace(/[\/\\]/g, "_")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/"/g, "'")
    .substring(0, 255);
}

export default async function handler(req, context) {
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

    // Get file from blob URL (no filesystem access)
    if (!photo.blobUrl || typeof photo.blobUrl !== "string") {
      return new Response("Photo file not available (missing blobUrl)", {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Fetch file from blob URL server-side
    let fileResponse;
    try {
      fileResponse = await fetch(photo.blobUrl);
      if (!fileResponse.ok) {
        console.error("Blob fetch failed:", fileResponse.status, fileResponse.statusText);
        return new Response("Error fetching photo file", {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
            "X-Admin-Alive": "true",
          },
        });
      }
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response("Error fetching photo file", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    // Get file bytes
    let fileBuffer;
    try {
      const arrayBuffer = await fileResponse.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (bufferError) {
      console.error("Buffer conversion error:", bufferError);
      return new Response("Error processing photo file", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Admin-Alive": "true",
        },
      });
    }

    const safeFilename = sanitizeFilename(photo.originalName || `photo-${photo.id}.png`);
    const mimeType = photo.mimeType || fileResponse.headers.get("content-type") || "application/octet-stream";

    // Return file with download headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "X-Admin-Alive": "true",
      },
    });
  } catch (error) {
    console.error("Error in download handler:", error);
    return new Response("Admin function failed", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "X-Admin-Alive": "true",
      },
    });
  }
}
