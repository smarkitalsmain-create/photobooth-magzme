/**
 * Ensure environment files exist for Prisma
 * This script runs after npm install to set up .env files
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverRoot = path.resolve(__dirname, "..");
const prismaDir = path.join(serverRoot, "prisma");
const envExamplePath = path.join(serverRoot, ".env.example");
const envPath = path.join(serverRoot, ".env");
const prismaEnvPath = path.join(prismaDir, ".env");

async function ensureEnv() {
  try {
    // Check if .env.example exists
    try {
      await fs.access(envExamplePath);
    } catch {
      console.error("ERROR: .env.example not found at", envExamplePath);
      console.error("Please create .env.example with DATABASE_URL and other required variables.");
      process.exit(1);
    }

    // Create /server/.env from .env.example if it doesn't exist
    try {
      await fs.access(envPath);
      console.log("✓ .env already exists");
    } catch {
      console.log("Creating .env from .env.example...");
      const envExampleContent = await fs.readFile(envExamplePath, "utf-8");
      await fs.writeFile(envPath, envExampleContent, "utf-8");
      console.log("✓ Created .env from .env.example");
      console.log("⚠️  Please update .env with your actual DATABASE_URL and credentials");
    }

    // Ensure prisma directory exists
    try {
      await fs.access(prismaDir);
    } catch {
      await fs.mkdir(prismaDir, { recursive: true });
    }

    // Create /server/prisma/.env from /server/.env
    try {
      const envContent = await fs.readFile(envPath, "utf-8");
      await fs.writeFile(prismaEnvPath, envContent, "utf-8");
      console.log("✓ Ensured prisma/.env exists");
    } catch (err) {
      console.error("Error creating prisma/.env:", err.message);
      process.exit(1);
    }

    console.log("✓ Environment files are ready");
  } catch (error) {
    console.error("Error setting up environment files:", error.message);
    process.exit(1);
  }
}

ensureEnv();
