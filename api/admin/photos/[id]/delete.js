/**
 * POST /api/admin/photos/[id]/delete
 * Delete photo (protected by Basic Auth)
 */

import { requireAuth } from "../../../_lib/basicAuth.js";
import { prisma } from "../../../_lib/prisma.js";
import { del } from "@vercel/blob";

export default async function handler(req, context) {
  if (req.method !== "POST") {
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

    // Delete blob from Vercel Blob if blobUrl exists
    if (photo.blobUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(photo.blobUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (blobError) {
        // Log but continue with DB deletion
        console.warn("Error deleting blob:", blobError);
      }
    }

    // Delete from database
    await prisma.photo.delete({
      where: { id },
    });

    // Redirect back to photos list
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/photos?deleted=1",
      },
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return new Response("Error deleting photo", { status: 500 });
  }
}
