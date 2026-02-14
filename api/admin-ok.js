export const config = { runtime: "nodejs" };

function unauthorized(res) {
  res.statusCode = 401;
  res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Unauthorized");
}

export default function handler(req, res) {
  const { ADMIN_USER, ADMIN_PASS } = process.env;

  if (!ADMIN_USER || !ADMIN_PASS) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Missing env: ADMIN_USER / ADMIN_PASS");
    return;
  }

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) return unauthorized(res);

  const decoded = Buffer.from(auth.split(" ")[1], "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  const user = idx >= 0 ? decoded.slice(0, idx) : "";
  const pass = idx >= 0 ? decoded.slice(idx + 1) : "";

  if (user !== ADMIN_USER || pass !== ADMIN_PASS) return unauthorized(res);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin</title>
        <style>
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px}
          a.button{display:inline-block;padding:12px 16px;border-radius:10px;border:1px solid #ddd;text-decoration:none}
        </style>
      </head>
      <body>
        <h1>Admin</h1>
        <p><a class="button" href="/admin/photos">Photo Management</a></p>
      </body>
    </html>
  `);
}
