/**
 * GET /api/admin/photos
 * Photo management page with list (protected by Basic Auth)
 * Serverless-safe: uses only DB + blobUrl, no filesystem
 * Minimal: inline auth and HTML rendering
 */

export const config = { runtime: "nodejs" };

import { prisma } from "../../_lib/prisma.js";

// Inline Basic Auth check (no external dependencies)
function checkAuth(req) {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return { authorized: false, status: 500, message: "Missing ADMIN_USER/ADMIN_PASS" };
  }

  let authHeader = null;
  try {
    if (req.headers) {
      if (typeof req.headers.get === "function") {
        authHeader = req.headers.get("authorization");
      } else if (req.headers.authorization) {
        authHeader = Array.isArray(req.headers.authorization)
          ? req.headers.authorization[0]
          : req.headers.authorization;
      }
    }
  } catch (err) {
    // Header access failed
  }

  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Basic ")) {
    return { authorized: false, status: 401, message: "Unauthorized" };
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    if (!base64Credentials) {
      return { authorized: false, status: 401, message: "Unauthorized" };
    }
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [username, password] = credentials.split(":");
    if (username === adminUser && password === adminPass) {
      return { authorized: true };
    }
  } catch (err) {
    // Decode failed
  }

  return { authorized: false, status: 401, message: "Unauthorized" };
}

// Inline HTML escape
function escapeHtml(text) {
  if (text == null) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// Inline HTML rendering (no external dependencies)
function renderPhotosList(photos, pagination, searchQuery) {
  const { page, limit, total, totalPages } = pagination;
  
  let tableRows = "";
  const photosWithBlob = photos.filter((p) => p.blobUrl && typeof p.blobUrl === "string");
  
  if (photosWithBlob.length === 0) {
    tableRows = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No photos found.</td></tr>';
  } else {
    photosWithBlob.forEach((photo) => {
      const sizeKB = ((photo.size || 0) / 1024).toFixed(2);
      const uploadDate = new Date(photo.createdAt).toLocaleString();
      tableRows += `
        <tr>
          <td><img src="${escapeHtml(photo.blobUrl)}" alt="Preview" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;" loading="lazy" onerror="this.style.display='none';"></td>
          <td>${escapeHtml(photo.originalName || "unnamed")}</td>
          <td>${escapeHtml(photo.mimeType || "unknown")}</td>
          <td>${sizeKB} KB</td>
          <td>${escapeHtml(uploadDate)}</td>
          <td>
            <a href="${escapeHtml(photo.blobUrl)}" target="_blank" class="btn" style="margin-right: 0.5rem;">View</a>
            <a href="/admin/photos/${escapeHtml(photo.id)}/download" class="btn" style="margin-right: 0.5rem;">Download</a>
            <form method="POST" action="/admin/photos/${escapeHtml(photo.id)}/delete" style="display: inline;" onsubmit="return confirm('Delete this photo?');">
              <button type="submit" class="btn btn-danger">Delete</button>
            </form>
          </td>
        </tr>
      `;
    });
  }

  let paginationHtml = "";
  if (totalPages > 1) {
    if (page > 1) {
      const prevParams = new URLSearchParams();
      prevParams.set("page", String(page - 1));
      prevParams.set("limit", String(limit));
      if (searchQuery) prevParams.set("q", searchQuery);
      paginationHtml += `<a href="/admin/photos?${prevParams.toString()}" class="btn" style="margin-right: 1rem;">← Previous</a>`;
    }
    paginationHtml += `<span style="margin: 0 1rem;">Page ${page} of ${totalPages} (${total} total)</span>`;
    if (page < totalPages) {
      const nextParams = new URLSearchParams();
      nextParams.set("page", String(page + 1));
      nextParams.set("limit", String(limit));
      if (searchQuery) nextParams.set("q", searchQuery);
      paginationHtml += `<a href="/admin/photos?${nextParams.toString()}" class="btn" style="margin-left: 1rem;">Next →</a>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photos - Admin Panel</title>
  <link rel="stylesheet" href="/admin/styles.css">
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>📸 Photobooth Admin</h1>
      <nav>
        <a href="/admin">Dashboard</a>
        <a href="/admin/photos">Photos</a>
      </nav>
    </header>
    <main class="admin-main">
      <h2>Photo Management</h2>
      <form method="GET" action="/admin/photos" style="margin: 1rem 0;">
        <input type="text" name="q" placeholder="Search by filename..." value="${escapeHtml(searchQuery || "")}" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-right: 0.5rem;">
        <button type="submit" class="btn">Search</button>
        ${searchQuery ? `<a href="/admin/photos" class="btn" style="margin-left: 0.5rem; background: #6c757d;">Clear</a>` : ""}
      </form>
      <table>
        <thead>
          <tr>
            <th>Preview</th>
            <th>Original Name</th>
            <th>MIME Type</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${paginationHtml ? `<div style="margin-top: 2rem; text-align: center;">${paginationHtml}</div>` : ""}
    </main>
  </div>
</body>
</html>`;
}

export default async function handler(req) {
  try {
    if (req.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Check env vars
    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
      return new Response("Missing ADMIN_USER/ADMIN_PASS", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }

    if (!process.env.DATABASE_URL) {
      return new Response("Missing DATABASE_URL", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Check Basic Auth
    const authResult = checkAuth(req);
    if (!authResult.authorized) {
      return new Response(authResult.message || "Unauthorized", {
        status: authResult.status || 401,
        headers: {
          "Content-Type": "text/plain",
          "WWW-Authenticate": 'Basic realm="Admin"',
        },
      });
    }

    // Parse query parameters
    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return new Response("Invalid request URL", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50), 200);
    const searchQuery = url.searchParams.get("q")?.trim() || null;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = searchQuery
      ? { originalName: { contains: searchQuery, mode: "insensitive" } }
      : {};

    // Get photos (short query, no heavy loops)
    let photos = [];
    let total = 0;

    try {
      [photos, total] = await Promise.all([
        prisma.photo.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
        }),
        prisma.photo.count({ where }),
      ]);
    } catch (dbError) {
      console.error("DB error:", dbError);
      return new Response("DB error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }

    if (!Array.isArray(photos)) {
      photos = [];
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pagination = { page, limit, total: total || 0, totalPages };

    // Render HTML immediately
    const html = renderPhotosList(photos, pagination, searchQuery);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Error in admin photos handler:", error);
    return new Response("Admin function failed", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
