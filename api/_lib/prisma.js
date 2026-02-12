/**
 * Prisma Client singleton for serverless functions
 * Prevents connection exhaustion in Vercel Functions
 * Uses globalThis for serverless compatibility
 * 
 * IMPORTANT: Prisma Client must be generated at build time via "postinstall": "prisma generate"
 * This file imports from @prisma/client which is generated from /prisma/schema.prisma
 */

import { PrismaClient } from "@prisma/client";

// Use globalThis for serverless (Vercel Functions)
// This ensures a single Prisma instance across all function invocations
const globalForPrisma = globalThis;

// Create singleton Prisma Client
// Vercel caches this across invocations, so we reuse the same instance
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Always store in globalThis for serverless
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

// Export as default for convenience
export default prisma;
