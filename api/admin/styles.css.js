/**
 * GET /api/admin/styles.css
 * Serve admin CSS styles
 */

export const config = { runtime: "nodejs" };

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSS file from server/admin/styles.css
const cssPath = path.join(__dirname, "../../server/admin/styles.css");

export default async function handler() {
  try {
    const css = fs.readFileSync(cssPath, "utf-8");
    return new Response(css, {
      status: 200,
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error reading CSS:", error);
    return new Response("/* CSS not found */", {
      status: 404,
      headers: {
        "Content-Type": "text/css",
      },
    });
  }
}
