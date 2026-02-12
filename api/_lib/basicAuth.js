/**
 * Basic Auth middleware for admin routes
 * Validates credentials from ADMIN_USER and ADMIN_PASS environment variables
 * NEVER throws - always returns a result object
 */

/**
 * Synchronous Basic Auth check (no async, no DB, no throws)
 * Returns { authorized: boolean, status?: number, message?: string, headers?: object }
 * On failure, includes WWW-Authenticate header
 */
export function checkBasicAuthSync(req) {
  try {
    // Check if credentials are configured
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminUser || !adminPass) {
      return {
        authorized: false,
        status: 500,
        message: "Server configuration error: ADMIN_USER or ADMIN_PASS not set",
        headers: {},
      };
    }

    // Get Authorization header (Vercel Request format)
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
      // Header access failed, continue with null
    }

    if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Basic ")) {
      return {
        authorized: false,
        status: 401,
        message: "Unauthorized",
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin"',
        },
      };
    }

    // Decode credentials safely
    try {
      const base64Credentials = authHeader.split(" ")[1];
      if (!base64Credentials) {
        return {
          authorized: false,
          status: 401,
          message: "Unauthorized",
          headers: {
            "WWW-Authenticate": 'Basic realm="Admin"',
          },
        };
      }
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      // Validate credentials
      if (username === adminUser && password === adminPass) {
        return { authorized: true };
      }
    } catch (err) {
      // Decode failed
      return {
        authorized: false,
        status: 401,
        message: "Unauthorized",
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin"',
        },
      };
    }

    // Invalid credentials
    return {
      authorized: false,
      status: 401,
      message: "Unauthorized",
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin"',
      },
    };
  } catch (error) {
    // Never throw - always return error result
    return {
      authorized: false,
      status: 500,
      message: "Authentication check failed",
      headers: {},
    };
  }
}

/**
 * Async version for routes that need it (kept for backward compatibility)
 */
export function checkBasicAuth(req) {
  return checkBasicAuthSync(req);
}

export function requireAuth(req) {
  const auth = checkBasicAuthSync(req);
  if (!auth.authorized) {
    return auth;
  }
  return null;
}

/**
 * Validate required environment variables
 * Returns error object if missing, null if all present
 */
export function validateEnv() {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.ADMIN_USER) missing.push("ADMIN_USER");
  if (!process.env.ADMIN_PASS) missing.push("ADMIN_PASS");

  if (missing.length > 0) {
    return {
      status: 500,
      message: `Missing required environment variables: ${missing.join(", ")}`,
    };
  }
  return null;
}

/**
 * Validate only admin credentials (no DB required)
 */
export function validateAdminEnv() {
  const missing = [];
  if (!process.env.ADMIN_USER) missing.push("ADMIN_USER");
  if (!process.env.ADMIN_PASS) missing.push("ADMIN_PASS");

  if (missing.length > 0) {
    return {
      status: 500,
      message: `Missing required environment variables: ${missing.join(", ")}`,
    };
  }
  return null;
}
