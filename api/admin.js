export const config = { runtime: "nodejs" };

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("ADMIN_BASE_OK");
}
