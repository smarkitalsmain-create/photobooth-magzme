/**
 * GET /api/debug/env
 * Returns boolean presence of environment variables (no values exposed)
 */

export const config = { runtime: "nodejs" };

export default function handler(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Return only boolean presence, never values
  const envStatus = {
    ADMIN_USER: !!process.env.ADMIN_USER,
    ADMIN_PASS: !!process.env.ADMIN_PASS,
    DATABASE_URL: !!process.env.DATABASE_URL,
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
  };

  return new Response(JSON.stringify(envStatus), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
