/**
 * GET /api/health/db
 * Health check endpoint that tests Prisma connection to Neon
 * Returns { ok: true } if DB is reachable, 500 if not
 */

export const config = { runtime: "nodejs" };

import { prisma } from "../_lib/prisma.js";

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

    // Simple query to test connection
    // Using $queryRaw for a lightweight SELECT 1
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error("DB health check failed:", dbError);
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
