/**
 * Prisma Client singleton for serverless functions
 * Prevents connection exhaustion in Vercel Functions
 * Uses globalThis for serverless compatibility
 * 
 * IMPORTANT: Prisma Client must be generated at build time via "postinstall": "prisma generate"
 * This file imports from @prisma/client which is generated from /prisma/schema.prisma
 * 
 * NEON + VERCEL REQUIREMENT:
 * On Vercel we must use Neon pooled connection string (pooler host) for Prisma to avoid hangs.
 * Example: postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require
 * Do NOT hardcode DATABASE_URL in code; only use process.env.DATABASE_URL
 */

import { PrismaClient } from "@prisma/client";

// Use globalThis for serverless (Vercel Functions)
// This ensures a single Prisma instance across all function invocations
const globalForPrisma = globalThis;

// Create singleton Prisma Client using nullish coalescing
// Vercel caches this across invocations, so we reuse the same instance
// DATABASE_URL is read from process.env (must be Neon pooled connection string on Vercel)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Store in globalThis for serverless (only if not already set)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

// Export as default for convenience
export default prisma;
