/**
 * POST /api/photos/upload
 * Upload a photo to Vercel Blob and save metadata to Neon
 */

import { put } from "@vercel/blob";
import { prisma } from "../_lib/prisma.js";
import busboy from "busboy";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_MB || "10") * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Promise((resolve) => {
    // Get headers in a format busboy can use
    const headers = {};
    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
      }
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
        // Upload to Vercel Blob
        const blob = await put(fileName, fileData, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        // Save metadata to database
        const photo = await prisma.photo.create({
          data: {
            originalName: fileName,
            mimeType: mimeType || "image/png",
            size: fileData.length,
            blobUrl: blob.url,
          },
        });

        resolve(
          new Response(
            JSON.stringify({
              id: photo.id,
              originalName: photo.originalName,
              mimeType: photo.mimeType,
              size: photo.size,
              createdAt: photo.createdAt,
              url: photo.blobUrl,
            }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      } catch (error) {
        console.error("Error uploading photo:", error);
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
  });
}
