/**
 * GET /api/ping
 * Ping endpoint - returns instantly for health checks
 */

export const config = { runtime: "nodejs" };

export default function handler(req) {
  // Return immediately - no async, no DB, no processing
  return new Response(
    JSON.stringify({ ok: true, ts: Date.now() }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
