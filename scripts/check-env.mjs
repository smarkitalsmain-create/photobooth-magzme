import "dotenv/config";

const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasDirectUrl = !!process.env.DIRECT_URL;

console.log("Environment Variables Check:");
console.log("DATABASE_URL:", hasDatabaseUrl ? "✓ exists" : "✗ missing");
console.log("DIRECT_URL:", hasDirectUrl ? "✓ exists" : "✗ missing");

if (!hasDatabaseUrl || !hasDirectUrl) {
  console.error("\nError: Missing required environment variables.");
  process.exit(1);
}

console.log("\n✓ All required environment variables are present.");
