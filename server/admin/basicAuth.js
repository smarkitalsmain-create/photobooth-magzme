/**
 * HTTP Basic Authentication middleware for admin routes
 * Validates credentials from ADMIN_USER and ADMIN_PASS environment variables
 */

export const basicAuth = (req, res, next) => {
  // Check if credentials are configured
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    console.error("ERROR: ADMIN_USER and ADMIN_PASS must be set in environment variables");
    return res.status(500).send("Server configuration error: Admin credentials not set");
  }

  // Get Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Authentication required");
  }

  // Decode credentials
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const [username, password] = credentials.split(":");

  // Validate credentials
  if (username === adminUser && password === adminPass) {
    return next();
  }

  // Invalid credentials
  res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
  return res.status(401).send("Invalid credentials");
};
