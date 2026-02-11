/**
 * Photobooth Server
 * Express server with Prisma, multer, and admin panel
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import adminRoutes from "./admin/routes.js";

// Load environment variables
// Database credentials are loaded only from server/.env and never exposed.
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables
// Server must fail loudly if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required but not set in environment variables. Please configure it in server/.env");
}

const requiredEnvVars = ["ADMIN_USER", "ADMIN_PASS"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error("ERROR: Missing required environment variables:");
  missingEnvVars.forEach((key) => console.error(`  - ${key}`));
  console.error("\nPlease set these in your .env file. See .env.example for reference.");
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5050;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch((err) => {
  console.error("Error creating uploads directory:", err);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// CORS for API endpoints (admin pages are same-origin)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: "Too many upload requests, please try again later.",
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many admin requests, please try again later.",
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${timestamp}-${random}-${safeName}${ext}`);
  },
});

const maxFileSize = parseInt(process.env.MAX_FILE_MB || "10") * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Serve static files from uploads directory
// NOTE: This is public for now. Consider making it private later by adding auth middleware
app.use("/uploads", express.static(uploadsDir));

// Serve admin CSS
app.use("/admin/styles.css", express.static(path.join(__dirname, "admin", "styles.css")));

// Public API routes

/**
 * POST /api/photos/upload - Upload a photo
 */
app.post("/api/photos/upload", uploadLimiter, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Save to database
    const photo = await prisma.photo.create({
      data: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: req.file.filename, // Relative to uploads directory
      },
    });

    res.status(201).json({
      id: photo.id,
      originalName: photo.originalName,
      mimeType: photo.mimeType,
      size: photo.size,
      createdAt: photo.createdAt,
      url: `/uploads/${photo.storagePath}`,
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({ error: "Error uploading photo" });
  }
});

/**
 * GET /api/photos - List photos (public API)
 */
app.get("/api/photos", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = parseInt(req.query.skip) || 0;

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true,
          storagePath: true,
        },
      }),
      prisma.photo.count(),
    ]);

    res.json({
      photos: photos.map((photo) => ({
        ...photo,
        url: `/uploads/${photo.storagePath}`,
      })),
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    res.status(500).json({ error: "Error fetching photos" });
  }
});

/**
 * GET /api/photos/:id - Get photo by ID
 */
app.get("/api/photos/:id", async (req, res) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
        storagePath: true,
      },
    });

    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    res.json({
      ...photo,
      url: `/uploads/${photo.storagePath}`,
    });
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({ error: "Error fetching photo" });
  }
});

// Admin routes (protected with Basic Auth and rate limiting)
app.use("/admin", adminLimiter, adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large" });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Photobooth server running on http://localhost:${PORT}`);
  console.log(`📸 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});
