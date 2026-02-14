/**
 * Prisma Client singleton for Vercel serverless functions
 * Uses global caching to prevent connection exhaustion
 */

import { PrismaClient } from "@prisma/client";

// Use globalThis for serverless (Vercel Functions)
const globalForPrisma = globalThis;

// Reuse prisma if already created, otherwise create new instance
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Store in globalThis for serverless (only if not already set)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
export { prisma };
