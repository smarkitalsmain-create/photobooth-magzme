/**
 * GET /api/admin
 * Admin dashboard page (protected by Basic Auth)
 * NO DATABASE CALLS - responds instantly
 * NO PRISMA - completely isolated from DB
 */

export const config = { runtime: "nodejs" };

// DO NOT import Prisma or any DB code
import { checkBasicAuthSync } from "../_lib/basicAuth.js";
import { renderDashboard } from "../_lib/render.js";

export default function handler(req) {
  // First: check ADMIN_USER and ADMIN_PASS exist
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    const missing = [];
    if (!process.env.ADMIN_USER) missing.push("ADMIN_USER");
    if (!process.env.ADMIN_PASS) missing.push("ADMIN_PASS");
    // Return 500 immediately and end response
    return new Response(`Missing required environment variables: ${missing.join(", ")}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  if (req.method !== "GET") {
    // Return 405 immediately and end response
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  // Call auth check (synchronous, no async, no DB)
  const authResult = checkBasicAuthSync(req);
  if (!authResult.authorized) {
    // Return 401 immediately and end response
    return new Response(authResult.message || "Unauthorized", {
      status: authResult.status || 401,
      headers: {
        "Content-Type": "text/plain",
        "WWW-Authenticate": 'Basic realm="Admin"',
        ...authResult.headers,
      },
    });
  }

  // Render dashboard (synchronous HTML generation, no DB calls, no async operations)
  const html = renderDashboard();
  
  // Return 200 immediately and end response
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}
