/**
 * GET /api/admin/photos
 * Photo management page with list (protected by Basic Auth)
 */

import { requireAuth } from "../../_lib/basicAuth.js";
import { prisma } from "../../_lib/prisma.js";
import { renderPhotosList } from "../../_lib/render.js";

export default async function handler(req) {
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
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
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

    // Get total count and photos
    const [total, photos] = await Promise.all([
      prisma.photo.count({ where }),
      prisma.photo.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const pagination = {
      page,
      limit,
      total,
      totalPages,
    };

    const html = renderPhotosList(photos, pagination, searchQuery);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return new Response("Error loading photos", { status: 500 });
  }
}
