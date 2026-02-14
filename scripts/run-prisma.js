/**
 * Prisma CLI wrapper that loads environment variables before running Prisma
 * Checks repo-root .env first, then server/.env, then process.env (Vercel)
 * Spawns Prisma CLI with the loaded environment variables
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

// Try to load env from repo-root .env first
const rootEnvPath = join(repoRoot, ".env");
const serverEnvPath = join(repoRoot, "server", ".env");

let envLoaded = false;
let envSource = "process.env (Vercel/runtime)";

if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  envLoaded = true;
  envSource = "repo-root .env";
} else if (existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
  envLoaded = true;
  envSource = "server/.env";
}

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "DIRECT_URL"];
const missing = [];
const empty = [];

for (const key of requiredEnvVars) {
  const value = process.env[key];
  if (!value) {
    missing.push(key);
  } else if (value.trim() === "") {
    empty.push(key);
  }
}

if (missing.length > 0 || empty.length > 0) {
  console.error("\n❌ Missing or empty required environment variables:");
  missing.forEach((key) => {
    console.error(`   - ${key} (not set)`);
  });
  empty.forEach((key) => {
    console.error(`   - ${key} (empty string)`);
  });
  console.error("\n📝 To fix this:");
  if (!envLoaded) {
    console.error("   1. Create .env file at repo root (copy from .env.example)");
    console.error("   2. Or create server/.env file");
  } else {
    console.error(`   1. Update ${envSource} with required values`);
  }
  console.error("   3. For Vercel: Set these in Vercel Project Settings > Environment Variables");
  process.exit(1);
}

console.log(`✓ Environment variables loaded from ${envSource}`);

// Get Prisma command arguments (everything after "node scripts/run-prisma.js")
const prismaArgs = process.argv.slice(2);

if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/run-prisma.js <prisma-command> [args...]");
  console.error("Example: node scripts/run-prisma.js validate");
  console.error("Example: node scripts/run-prisma.js migrate deploy");
  process.exit(1);
}

// Spawn Prisma CLI with loaded environment variables
const prismaProcess = spawn("npx", ["prisma", ...prismaArgs], {
  stdio: "inherit",
  env: process.env, // Inherit all env vars (including loaded ones)
  shell: true,
});

prismaProcess.on("error", (error) => {
  console.error("Failed to spawn Prisma CLI:", error);
  process.exit(1);
});

prismaProcess.on("exit", (code) => {
  process.exit(code || 0);
});
