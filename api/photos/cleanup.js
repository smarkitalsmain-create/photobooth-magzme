/**
 * POST /api/photos/cleanup
 * Delete legacy photos where blobUrl is null or empty
 * Protected by Basic Auth (admin only)
 */

export const config = { runtime: "nodejs" };

import prisma from "../_lib/prisma.js";
import { checkBasicAuthSync } from "../_lib/basicAuth.js";

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method !== "POST") {
      res.status(405).end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    // Check Basic Auth
    const auth = checkBasicAuthSync(req);
    if (!auth.authorized) {
      res.statusCode = auth.status || 401;
      if (auth.headers) {
        Object.entries(auth.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }
      res.end(JSON.stringify({ error: auth.message || "Unauthorized" }));
      return;
    }

    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      res.status(500).end(JSON.stringify({ error: "DATABASE_URL not configured" }));
      return;
    }

    // Find and delete photos with NULL or empty blobUrl
    const result = await prisma.photo.deleteMany({
      where: {
        OR: [
          { blobUrl: null },
          { blobUrl: "" },
        ],
      },
    });

    res.status(200).end(
      JSON.stringify({
        success: true,
        deleted: result.count,
        message: `Deleted ${result.count} legacy photo(s) with missing blobUrl`,
      })
    );
  } catch (err) {
    console.error("Error cleaning up legacy photos:", err);
    res.status(500).end(
      JSON.stringify({
        error: "Cleanup failed",
        message: err?.message || String(err),
      })
    );
  }
}
