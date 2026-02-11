/**
 * Admin panel routes
 */

import express from "express";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderPhotosList, renderPhotoDetail } from "./render.js";
import { basicAuth } from "./basicAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication
router.use(basicAuth);

/**
 * GET /admin - Redirect to photos list
 */
router.get("/", (req, res) => {
  res.redirect("/admin/photos");
});

/**
 * GET /admin/photos - List photos with pagination and search
 */
router.get("/photos", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
    const searchQuery = req.query.q?.trim() || null;
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
    res.send(html);
  } catch (error) {
    console.error("Error fetching photos:", error);
    res.status(500).send("Error loading photos");
  }
});

/**
 * GET /admin/photos/:id - Photo detail view
 */
router.get("/photos/:id", async (req, res) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.id },
    });

    if (!photo) {
      return res.status(404).send("Photo not found");
    }

    const html = renderPhotoDetail(photo);
    res.send(html);
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).send("Error loading photo");
  }
});

/**
 * GET /admin/photos/:id/download - Download photo as attachment
 */
router.get("/photos/:id/download", async (req, res) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.id },
    });

    if (!photo) {
      return res.status(404).send("Photo not found");
    }

    // Construct file path - only use storagePath from DB, never from request
    const uploadsDir = path.join(__dirname, "..", "uploads");
    const filePath = path.join(uploadsDir, photo.storagePath);

    // Prevent directory traversal - ensure path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return res.status(403).send("Invalid file path");
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, but we'll still try to send headers
      console.warn(`File not found: ${filePath}`);
    }

    // Sanitize filename for Content-Disposition
    const safeFilename = sanitizeFilename(photo.originalName);

    // Set headers for download
    res.setHeader("Content-Type", photo.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`
    );

    // Stream file
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
    fileStream.on("error", (err) => {
      console.error("Error streaming file:", err);
      if (!res.headersSent) {
        res.status(500).send("Error downloading file");
      }
    });
  } catch (error) {
    console.error("Error downloading photo:", error);
    if (!res.headersSent) {
      res.status(500).send("Error downloading photo");
    }
  }
});

/**
 * POST /admin/photos/:id/delete - Delete photo
 */
router.post("/photos/:id/delete", async (req, res) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.id },
    });

    if (!photo) {
      return res.status(404).send("Photo not found");
    }

    // Delete file from filesystem if it exists
    const uploadsDir = path.join(__dirname, "..", "uploads");
    const filePath = path.join(uploadsDir, photo.storagePath);

    // Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (resolvedPath.startsWith(resolvedUploadsDir)) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        // File might not exist, that's okay - continue with DB deletion
        console.warn(`File not found during delete: ${filePath}`, err.message);
      }
    }

    // Delete from database
    await prisma.photo.delete({
      where: { id: req.params.id },
    });

    // Redirect back to photos list with success message
    res.redirect("/admin/photos?deleted=1");
  } catch (error) {
    console.error("Error deleting photo:", error);
    res.status(500).send("Error deleting photo");
  }
});

/**
 * Sanitize filename for Content-Disposition header
 * Removes path separators and control characters
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[\/\\]/g, "_") // Replace path separators
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/"/g, "'") // Replace quotes
    .substring(0, 255); // Limit length
}

export default router;
