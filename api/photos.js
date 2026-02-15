/**
 * Consolidated photo API endpoint
 * Handles: GET (list), POST (upload), DELETE (cleanup)
 */

export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";
import prisma from "./_lib/prisma.js";
import { checkBasicAuthSync } from "./_lib/basicAuth.js";
import busboy from "busboy";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_MB || "10") * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms)),
  ]);
}

export default async function handler(req, res) {
  try {
    // GET: List photos
    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");

      const limitRaw = req.query?.limit;
      const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 50) || 50));

      const photos = await withTimeout(
        prisma.photo.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          select: { id: true, blobUrl: true, size: true, createdAt: true },
        }),
        5000
      );

      // Return all photos with hasUrl flag
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

    // POST: Upload photo
    if (req.method === "POST") {
      // Check if it's multipart/form-data (upload) or JSON (other operations)
      const contentType = req.headers?.["content-type"] || req.headers?.["Content-Type"] || "";
      const isMultipart = contentType.includes("multipart/form-data");

      if (!isMultipart) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(400).end(JSON.stringify({ error: "Expected multipart/form-data for upload" }));
        return;
      }

      // Validate required environment variables
      if (!process.env.DATABASE_URL) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(500).end(
          JSON.stringify({ error: "Missing required environment variable: DATABASE_URL" })
        );
        return;
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
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
          return resolve(
            new Response(JSON.stringify({ error: "Invalid request headers" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            })
          );
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
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(uploadError.status).end(JSON.stringify({ error: uploadError.message }));
            return;
          }

          if (!fileData || !fileName) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(400).end(JSON.stringify({ error: "No file uploaded" }));
            return;
          }

          try {
            console.log("UPLOAD_START", { fileName, size: fileData.length });

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

            console.log("BLOB_UPLOADED", { id: "uploaded", blobUrlLength: uploaded.url.length });

            // Save metadata to database (blobUrl is guaranteed to be set)
            // DB insert happens ONLY after blob upload succeeds
            // NEVER use placeholder URLs - always use uploaded.url
            const photo = await prisma.photo.create({
              data: {
                originalName: fileName,
                mimeType: mimeType || "image/png",
                size: fileData.length,
                blobUrl: uploaded.url, // Use uploaded.url (real Vercel Blob URL)
                createdAt: new Date(),
              },
            });

            console.log("DB_ROW_CREATED", { id: photo.id });

            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(201).end(
              JSON.stringify({
                ok: true,
                id: photo.id,
                blobUrl: photo.blobUrl,
                url: photo.blobUrl, // Also include 'url' for backward compatibility
                createdAt: photo.createdAt,
              })
            );
          } catch (error) {
            console.error("Error uploading photo:", error);
            // If blob upload fails, DO NOT create DB row
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(500).end(JSON.stringify({ error: "Error uploading photo" }));
          }
        });

        bb.on("error", (error) => {
          console.error("Busboy error:", error);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(500).end(JSON.stringify({ error: "Error processing upload" }));
        });

        // Handle request body - Vercel provides body as ReadableStream or ArrayBuffer
        try {
          if (req.body) {
            if (typeof req.body.pipe === "function") {
              // Stream
              req.body.pipe(bb);
            } else if (req.body instanceof ReadableStream) {
              // ReadableStream
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
              // ArrayBuffer or Buffer
              const buffer = req.body instanceof ArrayBuffer ? Buffer.from(req.body) : req.body;
              bb.end(buffer);
            }
          } else {
            // No body, end immediately
            bb.end();
          }
        } catch (bodyError) {
          console.error("Error handling request body:", bodyError);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(400).end(JSON.stringify({ error: "Error processing request body" }));
        }
      });
    }

    // DELETE: Cleanup legacy photos (admin only)
    if (req.method === "DELETE") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");

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
    res.setHeader("Content-Type", "application/json; charset=utf-8");
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
