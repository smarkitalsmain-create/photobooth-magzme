/**
 * GET /api/photos/debug-count
 * Debug endpoint: Count rows in Photo table
 * Admin-protected
 */

export const config = { runtime: "nodejs" };

import prisma from "../_lib/prisma.js";
import { checkBasicAuthSync } from "../_lib/basicAuth.js";

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method !== "GET") {
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

    // Count rows in Photo table
    const count = await prisma.photo.count();

    res.status(200).end(JSON.stringify({ ok: true, count }));
  } catch (err) {
    console.error("Error counting photos:", err);
    res.status(500).end(
      JSON.stringify({
        error: "Count failed",
        message: err?.message || String(err),
      })
    );
  }
}
