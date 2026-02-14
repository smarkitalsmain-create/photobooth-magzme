/**
 * GET /api/health/env
 * Safe environment variable check endpoint
 * Returns boolean presence of required env vars without leaking values
 */

export const config = { runtime: "nodejs" };

export default function handler(req) {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
