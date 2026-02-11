/**
 * GET /api/admin/photos/[id]/download
 * Download photo as attachment (protected by Basic Auth)
 */

import { requireAuth } from "../../../_lib/basicAuth.js";
import { prisma } from "../../../_lib/prisma.js";

function sanitizeFilename(filename) {
  return filename
    .replace(/[\/\\]/g, "_")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/"/g, "'")
    .substring(0, 255);
}

export default async function handler(req, context) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Check Basic Auth
  const authError = requireAuth(req);
  if (authError) {
    return new Response(authError.message, {
      status: authError.status,
      headers: {
        "Content-Type": "text/plain",
        ...authError.headers,
      },
    });
  }

  try {
    // Get ID from URL or context params
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const id = context?.params?.id || pathParts[pathParts.length - 2]; // [id] is second to last

    const photo = await prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      return new Response("Photo not found", { status: 404 });
    }

    // Get file from blob URL
    if (!photo.blobUrl) {
      return new Response("Photo file not available", { status: 404 });
    }

    // Fetch file from blob URL
    const fileResponse = await fetch(photo.blobUrl);
    if (!fileResponse.ok) {
      return new Response("Error fetching photo file", { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const safeFilename = sanitizeFilename(photo.originalName);

    // Return file with download headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading photo:", error);
    return new Response("Error downloading photo", { status: 500 });
  }
}
