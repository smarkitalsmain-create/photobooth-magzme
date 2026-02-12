/**
 * GET /api/health/db
 * Health check endpoint that tests Prisma connection to Neon
 * Returns { ok: true } if DB is reachable, 500/504 if not
 * Has hard 8s timeout to prevent hanging
 */

export const config = { runtime: "nodejs" };

import { prisma } from "../_lib/prisma.js";

// Timeout helper using Promise.race
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    ),
  ]);
}

export default async function handler(req) {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Hard check: DATABASE_URL required
    if (!process.env.DATABASE_URL) {
      return new Response(
        JSON.stringify({ ok: false, error: "DATABASE_URL not set" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Simple query to test connection with 8s timeout
    // Using $queryRaw for a lightweight SELECT 1
    try {
      await withTimeout(prisma.$queryRaw`SELECT 1`, 8000);
    } catch (dbError) {
      console.error("DB health check failed:", dbError);
      
      // Check if it was a timeout
      if (dbError.message === "Timeout") {
        return new Response(
          JSON.stringify({ ok: false, error: "DB timeout" }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ ok: false, error: "Database connection failed" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "Health check failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
