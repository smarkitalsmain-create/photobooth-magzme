/**
 * Consolidated photo API endpoint
 * Handles all photo operations via query parameter: ?op=list|ping|test-insert
 * Also handles POST upload and POST seed
 */

export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";
import prisma from "./_lib/prisma.js";
import { checkBasicAuthSync } from "./_lib/basicAuth.js";
import busboy from "busboy";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_MB || "10") * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

// Basic Auth helper with fallback
function requireAuth(req) {
  const adminUser = process.env.ADMIN_USER || "Admin";
  const adminPass = process.env.ADMIN_PASS || "magzme1234";

  let authHeader = null;
  try {
    if (req.headers) {
      if (typeof req.headers.get === "function") {
        authHeader = req.headers.get("authorization");
      } else if (req.headers.authorization) {
        authHeader = Array.isArray(req.headers.authorization)
          ? req.headers.authorization[0]
          : req.headers.authorization;
      }
    }
  } catch (err) {
    // Header access failed
  }

  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Basic ")) {
    return { authorized: false };
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    if (!base64Credentials) {
      return { authorized: false };
    }
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [username, password] = credentials.split(":");

    if (username === adminUser && password === adminPass) {
      return { authorized: true };
    }
  } catch (err) {
    // Decode failed
  }

  return { authorized: false };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms)),
  ]);
}

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    const op = req.query?.op;

    // GET: Route by operation
    if (req.method === "GET") {
      // GET /api/photos?op=ping
      if (op === "ping") {
        res.status(200).end(JSON.stringify({ ok: true, ts: Date.now() }));
        return;
      }

      // GET /api/photos?op=list&limit=50 (default operation)
      if (op === "list" || !op) {
        const limitRaw = req.query?.limit;
        const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 50) || 50));

        const photos = await withTimeout(
          prisma.photo.findMany({
            where: {
              AND: [
                { blobUrl: { not: null } },
                { blobUrl: { not: "" } },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: { id: true, blobUrl: true, size: true, createdAt: true },
          }),
          5000
        );

        const items = photos.map((p) => {
          const url = (p.blobUrl ?? "").trim() || null;
          return {
            id: p.id,
            blobUrl: url,
            hasUrl: !!url,
            createdAt: p.createdAt,
            size: p.size ?? null,
          };
        });

        res.status(200).end(JSON.stringify({ items }));
        return;
      }

      // Unknown operation
      res.status(400).end(JSON.stringify({ error: "Unknown operation" }));
      return;
    }

    // POST: Route by operation or content type
    if (req.method === "POST") {
      const contentType = req.headers?.["content-type"] || req.headers?.["Content-Type"] || "";
      const isMultipart = contentType.includes("multipart/form-data");

      // POST /api/photos?op=test-insert (admin required)
      if (op === "test-insert") {
        const auth = requireAuth(req);
        if (!auth.authorized) {
          res.statusCode = 401;
          res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }

        if (!process.env.DATABASE_URL) {
          res.status(500).end(JSON.stringify({ error: "DATABASE_URL not configured" }));
          return;
        }

        const photo = await prisma.photo.create({
          data: {
            originalName: "test-insert.jpg",
            mimeType: "image/jpeg",
            size: 0,
            blobUrl: "https://picsum.photos/600",
            storagePath: null,
            createdAt: new Date(),
          },
        });

        console.log("TEST_INSERT_OK", { id: photo.id });

        res.status(201).end(
          JSON.stringify({
            ok: true,
            id: photo.id,
            blobUrl: photo.blobUrl,
          })
        );
        return;
      }

      // POST /api/photos with JSON { seed: true } (admin required)
      if (!isMultipart) {
        try {
          let body = null;
          if (req.body) {
            if (typeof req.body === "string") {
              body = JSON.parse(req.body);
            } else if (typeof req.body === "object") {
              body = req.body;
            }
          }

          if (body && body.seed === true) {
            const auth = requireAuth(req);
            if (!auth.authorized) {
              res.statusCode = 401;
              res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
              res.end(JSON.stringify({ error: "Unauthorized" }));
              return;
            }

            if (!process.env.DATABASE_URL) {
              res.status(500).end(JSON.stringify({ error: "DATABASE_URL not configured" }));
              return;
            }

            const photo = await prisma.photo.create({
              data: {
                originalName: "seed-test.jpg",
                mimeType: "image/jpeg",
                size: 0,
                blobUrl: "https://picsum.photos/600",
                storagePath: null,
                createdAt: new Date(),
              },
            });

            console.log("SEED_PHOTO_CREATED", { id: photo.id });

            res.status(201).end(
              JSON.stringify({
                ok: true,
                id: photo.id,
                blobUrl: photo.blobUrl,
                message: "Seed photo created",
              })
            );
            return;
          }
        } catch (parseError) {
          // Not JSON seed, continue to upload flow
        }

        // If not seed and not multipart, return error
        res.status(400).end(JSON.stringify({ error: "Expected multipart/form-data for upload" }));
        return;
      }

      // POST /api/photos (multipart upload - no auth required for now)
      if (!process.env.DATABASE_URL) {
        res.status(500).end(
          JSON.stringify({ error: "Missing required environment variable: DATABASE_URL" })
        );
        return;
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        res.status(500).end(
          JSON.stringify({
            error: "Missing required environment variable: BLOB_READ_WRITE_TOKEN",
          })
        );
        return;
      }

      return new Promise((resolve) => {
        // Get headers in a format busboy can use
        const headers = {};
        try {
          if (req.headers) {
            for (const [key, value] of Object.entries(req.headers)) {
              headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
            }
          }
        } catch (headerError) {
          console.error("Error processing headers:", headerError);
          res.status(400).end(JSON.stringify({ error: "Invalid request headers" }));
          return;
        }

        const bb = busboy({
          headers,
          limits: { fileSize: MAX_FILE_SIZE },
        });

        let fileData = null;
        let fileName = null;
        let mimeType = null;
        let uploadError = null;

        bb.on("file", (name, file, info) => {
          if (name !== "file") {
            file.resume();
            return;
          }

          fileName = info.filename;
          mimeType = info.mimeType;

          // Validate MIME type
          if (!ALLOWED_MIME_TYPES.includes(mimeType?.toLowerCase())) {
            file.resume();
            uploadError = { status: 400, message: "Only JPEG, PNG, and WebP images are allowed" };
            return;
          }

          const chunks = [];
          let size = 0;

          file.on("data", (chunk) => {
            chunks.push(chunk);
            size += chunk.length;
            if (size > MAX_FILE_SIZE) {
              file.resume();
              uploadError = { status: 400, message: "File too large" };
            }
          });

          file.on("end", () => {
            if (!uploadError) {
              fileData = Buffer.concat(chunks);
            }
          });
        });

        bb.on("finish", async () => {
          if (uploadError) {
            res.status(uploadError.status).end(JSON.stringify({ error: uploadError.message }));
            return;
          }

          if (!fileData || !fileName) {
            res.status(400).end(
              JSON.stringify({
                ok: false,
                error: "NO_FILE",
              })
            );
            return;
          }

          try {
            console.log("UPLOAD_START");
            console.log(`UPLOAD_FILE_RECEIVED ${fileName} ${fileData.length}`);

            // Check BLOB_READ_WRITE_TOKEN before uploading
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
              console.error("MISSING_BLOB_TOKEN");
              res.status(500).end(
                JSON.stringify({
                  ok: false,
                  error: "MISSING_BLOB_TOKEN",
                  message: "Set BLOB_READ_WRITE_TOKEN in Vercel env vars",
                })
              );
              return;
            }

            // Upload to Vercel Blob
            const uploaded = await put(fileName, fileData, {
              access: "public",
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });

            // Safety check: Reject if blob URL is missing
            if (!uploaded.url || uploaded.url.trim() === "") {
              throw new Error("Blob upload succeeded but URL is missing");
            }

            // Validate URL is a real Vercel Blob URL (not placeholder)
            if (!uploaded.url.startsWith("https://")) {
              throw new Error("Invalid blob URL format");
            }

            console.log("BLOB_UPLOADED");

            // Save metadata to database (blobUrl is guaranteed to be set)
            const photo = await prisma.photo.create({
              data: {
                blobUrl: uploaded.url,
                size: fileData.length,
                createdAt: new Date(),
              },
            });

            console.log(`DB_ROW_CREATED ${photo.id}`);

            res.status(201).end(
              JSON.stringify({
                ok: true,
                id: photo.id,
                blobUrl: photo.blobUrl,
              })
            );
          } catch (error) {
            console.error("Error uploading photo:", error);
            res.status(500).end(JSON.stringify({ error: "Error uploading photo" }));
          }
        });

        bb.on("error", (error) => {
          console.error("Busboy error:", error);
          res.status(500).end(JSON.stringify({ error: "Error processing upload" }));
        });

        // Handle request body
        try {
          if (req.body) {
            if (typeof req.body.pipe === "function") {
              req.body.pipe(bb);
            } else if (req.body instanceof ReadableStream) {
              const reader = req.body.getReader();
              const pump = async () => {
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                      bb.end();
                      break;
                    }
                    bb.write(value);
                  }
                } catch (err) {
                  console.error("Stream error:", err);
                  bb.end();
                }
              };
              pump();
            } else {
              const buffer = req.body instanceof ArrayBuffer ? Buffer.from(req.body) : req.body;
              bb.end(buffer);
            }
          } else {
            bb.end();
          }
        } catch (bodyError) {
          console.error("Error handling request body:", bodyError);
          res.status(400).end(JSON.stringify({ error: "Error processing request body" }));
        }
      });
    }

    // DELETE: Cleanup legacy photos (admin only)
    if (req.method === "DELETE") {
      const auth = requireAuth(req);
      if (!auth.authorized) {
        res.statusCode = 401;
        res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      if (!process.env.DATABASE_URL) {
        res.status(500).end(JSON.stringify({ error: "DATABASE_URL not configured" }));
        return;
      }

      const result = await prisma.photo.deleteMany({
        where: {
          OR: [{ blobUrl: null }, { blobUrl: "" }],
        },
      });

      res.status(200).end(
        JSON.stringify({
          deletedCount: result.count,
        })
      );
      return;
    }

    // Method not allowed
    res.status(405).end(JSON.stringify({ error: "Method not allowed" }));
  } catch (err) {
    const isTimeout = String(err?.message || "").includes("TIMEOUT");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // On timeout for GET, return empty list instead of error (fail-safe)
    if (isTimeout && req.method === "GET") {
      res.status(200).end(JSON.stringify({ items: [] }));
      return;
    }

    // On other errors, return error JSON
    console.error("Error in photos handler:", err);
    res.status(500).end(
      JSON.stringify({
        error: "PHOTO_API_ERROR",
        message: err?.message || String(err),
      })
    );
  }
}
