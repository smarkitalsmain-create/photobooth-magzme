/**
 * Photobooth Server
 * Express server with Prisma, multer, and admin panel
 * 
 * DEPLOYMENT NOTES:
 * - This backend must be deployed separately from the Vite frontend
 * - /admin and /api routes are served ONLY by this Express server
 * - Frontend static hosting alone will NOT support admin routes
 * - Ensure reverse proxy (nginx, Cloudflare, etc.) routes /admin, /api, and /uploads to this server
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

// Production readiness check - validate required environment variables
// Server must fail loudly if required vars are missing
const requiredEnvVars = ["DATABASE_URL", "ADMIN_USER", "ADMIN_PASS"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error("ERROR: Missing required environment variables:");
  missingEnvVars.forEach((key) => console.error(`  - ${key}`));
  console.error("\nPlease set these in your environment. See .env.example for reference.");
  console.error("Server will not start without these variables.");
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5050;

// Trust proxy for reverse proxy deployments (nginx, Cloudflare, etc.)
// This allows Express to correctly identify client IPs and handle X-Forwarded-* headers
app.set("trust proxy", true);

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

// CORS for API endpoints
// In production, set CORS_ORIGIN to your frontend domain (e.g., https://photobooth.magzme.com)
// Admin pages are same-origin and don't require CORS
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === "production" ? undefined : "*");
app.use(
  cors({
    origin: corsOrigin,
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
// Server listens on process.env.PORT (required by most hosting platforms)
// Defaults to 5050 for local development
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Photobooth server running on port ${PORT}`);
  console.log(`📸 Admin panel: /admin`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`✅ Production readiness check passed`);
  console.log(`🔒 Admin routes protected with Basic Auth`);
  if (process.env.NODE_ENV === "production") {
    console.log(`🌐 Production mode: Ensure reverse proxy routes /admin, /api, and /uploads to this server`);
  }
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
