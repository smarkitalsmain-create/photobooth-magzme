/**
 * Basic Auth middleware for admin routes
 * Validates credentials from ADMIN_USER and ADMIN_PASS environment variables
 */

export function checkBasicAuth(req) {
  // Check if credentials are configured
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return {
      authorized: false,
      error: {
        status: 500,
        message: "Server configuration error: Admin credentials not set",
      },
    };
  }

  // Get Authorization header (Vercel Request format)
  const authHeader =
    req.headers?.authorization ||
    req.headers?.get?.("authorization") ||
    (typeof req.headers?.get === "function" ? req.headers.get("authorization") : null);

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return {
      authorized: false,
      error: {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin Panel"',
        },
        message: "Authentication required",
      },
    };
  }

  // Decode credentials
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const [username, password] = credentials.split(":");

  // Validate credentials
  if (username === adminUser && password === adminPass) {
    return { authorized: true };
  }

  // Invalid credentials
  return {
    authorized: false,
    error: {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin Panel"',
      },
      message: "Invalid credentials",
    },
  };
}

export function requireAuth(req) {
  const auth = checkBasicAuth(req);
  if (!auth.authorized) {
    return auth.error;
  }
  return null;
}
