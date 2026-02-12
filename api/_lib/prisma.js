/**
 * Prisma Client singleton for serverless functions
 * Prevents connection exhaustion in Vercel Functions
 * Uses globalThis for serverless compatibility
 */

import { PrismaClient } from "@prisma/client";

// Use globalThis for serverless (Vercel Functions)
const globalForPrisma = globalThis;

// Ensure singleton pattern works in serverless environments
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Always store in globalThis for serverless
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
