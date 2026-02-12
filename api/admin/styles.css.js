/**
 * GET /api/admin/styles.css
 * Serve admin CSS styles (inline, no filesystem)
 */

export const config = { runtime: "nodejs" };

const css = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}
.admin-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
.admin-header {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.admin-header h1 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}
.admin-header nav a {
  color: #007bff;
  text-decoration: none;
  margin-right: 1rem;
}
.admin-header nav a:hover {
  text-decoration: underline;
}
.admin-main {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}
th {
  background: #f8f9fa;
  font-weight: 600;
}
.photo-thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}
.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  font-size: 0.875rem;
}
.btn:hover {
  background: #0056b3;
}
.btn-danger {
  background: #dc3545;
}
.btn-danger:hover {
  background: #c82333;
}
`;

export default function handler() {
  return new Response(css, {
    status: 200,
    headers: {
      "Content-Type": "text/css",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
