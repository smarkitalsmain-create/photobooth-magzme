/**
 * GET /api/admin
 * Admin dashboard page (protected by Basic Auth)
 * NO DATABASE CALLS - responds instantly
 */

export const config = { runtime: "nodejs" };

import { checkBasicAuthSync } from "../_lib/basicAuth.js";
import { renderDashboard } from "../_lib/render.js";

export default function handler(req) {
  // Hard env check - must be synchronous
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    const missing = [];
    if (!process.env.ADMIN_USER) missing.push("ADMIN_USER");
    if (!process.env.ADMIN_PASS) missing.push("ADMIN_PASS");
    return new Response(`Missing required environment variables: ${missing.join(", ")}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "X-Admin-Alive": "true",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        "Content-Type": "text/plain",
        "X-Admin-Alive": "true",
      },
    });
  }

  // Check Basic Auth (synchronous, no async operations)
  const authResult = checkBasicAuthSync(req);
  if (!authResult.authorized) {
    return new Response(authResult.message || "Unauthorized", {
      status: authResult.status || 401,
      headers: {
        "Content-Type": "text/plain",
        "WWW-Authenticate": 'Basic realm="Admin"',
        "X-Admin-Alive": "true",
      },
    });
  }

  // Render dashboard (synchronous HTML generation, no DB calls)
  const html = renderDashboard();
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "X-Admin-Alive": "true",
    },
  });
}
