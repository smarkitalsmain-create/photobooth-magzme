/**
 * GET /api/photos/ping
 * Quick debug endpoint for verification
 */

export const config = { runtime: "nodejs" };

export default function handler(req) {
  return new Response(
    JSON.stringify({ 
      ok: true, 
      ts: Date.now() 
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
