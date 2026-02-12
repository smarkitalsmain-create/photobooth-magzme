/**
 * GET /api/admin
 * Minimal admin dashboard - responds instantly, no dependencies
 * NO PRISMA, NO DB, NO BLOB, NO EXTERNAL IMPORTS
 */

export const config = { runtime: "nodejs" };

export default function handler(req) {
  // Check ADMIN_USER and ADMIN_PASS exist
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return new Response("Missing ADMIN_USER/ADMIN_PASS", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Parse Authorization header safely
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
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
        "WWW-Authenticate": 'Basic realm="Admin"',
      },
    });
  }

  // Decode credentials
  try {
    const base64Credentials = authHeader.split(" ")[1];
    if (!base64Credentials) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "Content-Type": "text/plain",
          "WWW-Authenticate": 'Basic realm="Admin"',
        },
      });
    }

    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [username, password] = credentials.split(":");

    // Validate credentials
    if (username !== adminUser || password !== adminPass) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "Content-Type": "text/plain",
          "WWW-Authenticate": 'Basic realm="Admin"',
        },
      });
    }
  } catch (err) {
    // Decode failed
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
        "WWW-Authenticate": 'Basic realm="Admin"',
      },
    });
  }

  // Auth successful - return HTML immediately
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Photobooth</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      text-align: center;
      max-width: 600px;
      width: 100%;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 3rem;
      color: #1a1a1a;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 3rem 4rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }
    .card a {
      display: inline-block;
      text-decoration: none;
      color: #333;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    .title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .desc {
      color: #6c757d;
      font-size: 1rem;
    }
    .btn {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #007bff;
      color: white;
      border-radius: 6px;
      font-weight: 500;
      margin-top: 1rem;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Admin Dashboard</h1>
    <div class="card">
      <a href="/admin/photos">
        <div class="icon">📸</div>
        <div class="title">Photo Management</div>
        <div class="desc">View, download, and delete captured photos</div>
        <div class="btn">Go to Photos</div>
      </a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
