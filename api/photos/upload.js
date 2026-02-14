/**
 * POST /api/photos/upload
 * Upload a photo to Vercel Blob and save metadata to Neon
 */

export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";
import prisma from "../_lib/prisma.js";
import busboy from "busboy";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_MB || "10") * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate required environment variables
    if (!process.env.DATABASE_URL) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variable: DATABASE_URL" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variable: BLOB_READ_WRITE_TOKEN" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Promise((resolve, reject) => {
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
          return resolve(
            new Response(JSON.stringify({ error: uploadError.message }), {
              status: uploadError.status,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        if (!fileData || !fileName) {
          return resolve(
            new Response(JSON.stringify({ error: "No file uploaded" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            })
          );
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

          resolve(
            new Response(
              JSON.stringify({
                ok: true,
                id: photo.id,
                blobUrl: photo.blobUrl,
                url: photo.blobUrl, // Also include 'url' for backward compatibility
                createdAt: photo.createdAt,
              }),
              {
                status: 201,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        } catch (error) {
          console.error("Error uploading photo:", error);
          // If blob upload fails, DO NOT create DB row
          resolve(
            new Response(JSON.stringify({ error: "Error uploading photo" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
      });

      bb.on("error", (error) => {
        console.error("Busboy error:", error);
        resolve(
          new Response(JSON.stringify({ error: "Error processing upload" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        );
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
        resolve(
          new Response(JSON.stringify({ error: "Error processing request body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    });
  } catch (error) {
    console.error("Error in upload handler:", error);
    return new Response(JSON.stringify({ error: "Upload function failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
