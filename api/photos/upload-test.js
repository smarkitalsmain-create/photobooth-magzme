/**
 * POST /api/photos/upload-test
 * Test endpoint: Insert a test row directly into DB
 * Admin-protected
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

    // Insert test row directly in DB
    const photo = await prisma.photo.create({
      data: {
        originalName: "test.png",
        mimeType: "image/png",
        size: 1,
        blobUrl: "https://dummy.public.blob.vercel-storage.com/test.png",
        createdAt: new Date(),
      },
    });

    console.log(`UPLOAD_TEST_DB_OK ${photo.id}`);

    res.status(200).end(
      JSON.stringify({
        ok: true,
        id: photo.id,
      })
    );
  } catch (err) {
    console.error("Error inserting test photo:", err);
    res.status(500).end(
      JSON.stringify({
        error: "Insert failed",
        message: err?.message || String(err),
      })
    );
  }
}
