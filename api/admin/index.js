/**
 * GET /api/admin
 * Admin dashboard page (protected by Basic Auth)
 */

import { requireAuth } from "../_lib/basicAuth.js";
import { renderDashboard } from "../_lib/render.js";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Check Basic Auth
  const authError = requireAuth(req);
  if (authError) {
    return new Response(authError.message, {
      status: authError.status,
      headers: {
        "Content-Type": "text/plain",
        ...authError.headers,
      },
    });
  }

  // Render dashboard
  const html = renderDashboard();
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}
