# Photobooth Application

Vite + React frontend with Vercel Serverless Functions backend, using Prisma + Neon PostgreSQL and Vercel Blob storage.

## Database Cleanup

### Manual SQL Cleanup (One-Time)

To remove photos with missing blob URLs from the database, run this SQL command directly against your Neon database:

```sql
DELETE FROM photos WHERE blobUrl IS NULL OR blobUrl = '';
```

**Important Notes:**
- This is a **destructive operation** - photos without blob URLs will be permanently deleted
- Run this **manually** via Neon Console SQL Editor or `psql`
- Do **NOT** run this automatically in migrations or build scripts
- This only deletes database records, not blob storage files

### Alternative: Use Cleanup Script

You can also use the provided cleanup script:

```bash
node scripts/cleanup-null-photos.mjs
```

This script will:
- Find all photos with NULL `blobUrl`
- Show a 5-second warning
- Delete them from the database
- Print the count of deleted photos

## Prisma Migrations

### Failed Migration Resolution

The migration `20241220000001_make_blob_url_required` was rolled back because it attempted to enforce NOT NULL on `blobUrl` when NULL values existed.

**Current State:**
- `blobUrl` is **nullable** (`String?`) in the schema
- This is the **permanent** state - no further attempts to make it required
- Photos with NULL `blobUrl` are filtered out by the API

### Running Migrations

**Local Development:**
```bash
npm run prisma:migrate:dev -- --name migration_name
```

**Production (Vercel):**
```bash
npm run prisma:migrate:deploy
```

**Note:** Migrations are **NOT** run automatically during build. Deploy migrations manually when needed.

## Environment Variables

### Required Variables

- `DATABASE_URL` - Neon PostgreSQL connection string (pooled)
- `DIRECT_URL` - Neon PostgreSQL direct connection string
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `ADMIN_USER` - Basic Auth username for admin routes
- `ADMIN_PASS` - Basic Auth password for admin routes

### Local Development

Create `.env` at repo root or `server/.env` with the above variables.

### Vercel Deployment

Set all environment variables in Vercel Project Settings > Environment Variables.

## Build & Deploy

### Vercel Build Process

**Build Command:**
```bash
npm run build
```

This runs:
- `vite build` - Builds frontend
- `prisma generate` - Generates Prisma Client (via postinstall)

**Important:** 
- **NO migrations run during build** - This prevents P1001 connection errors on Vercel
- Prisma Client is generated automatically via `postinstall` script
- Database migrations must be run **manually** when schema changes

### Running Migrations

**Before/After Deploying Schema Changes:**

1. **Local Development:**
   ```bash
   npm run migrate:dev -- --name migration_name
   ```

2. **Production (Vercel):**
   ```bash
   npm run prisma:migrate:deploy
   ```
   
   Or run directly in Vercel CLI:
   ```bash
   vercel env pull .env.local
   npm run prisma:migrate:deploy
   ```

**Note:** Migrations should be run **after** deploying code changes, not during the build process. The build only generates the Prisma Client, it does not modify the database schema.

## API Endpoints

### Consolidated Photo API (`/api/photos`)

All photo operations are handled by a single endpoint using query parameters:

- `GET /api/photos?op=list&limit=50` - List photos (filters out NULL blobUrl)
- `GET /api/photos?op=ping` - Health check endpoint
- `POST /api/photos` - Upload new photo (multipart/form-data)
- `POST /api/photos` with `{ seed: true }` - Seed test photo (admin required)
- `POST /api/photos?op=test-insert` - Insert test row (admin required)
- `DELETE /api/photos` - Cleanup legacy photos (admin required)

**Legacy URLs (via rewrites):**
- `/api/photos/list` → `/api/photos?op=list`
- `/api/photos/ping` → `/api/photos?op=ping`
- `/api/photos/test-insert` → `/api/photos?op=test-insert`

### Other Endpoints

- `GET /admin` - Admin dashboard (Basic Auth)
- `GET /admin/photos` - Photo management (Basic Auth)

### Local Testing

Test the photo API endpoints locally:

```bash
# Ping endpoint
curl -s "http://localhost:5173/api/photos?op=ping"

# List photos (limit 5)
curl -s "http://localhost:5173/api/photos?op=list&limit=5"

# Seed a test photo (admin required)
curl -s -X POST -u "Admin:magzme1234" \
  -H "Content-Type: application/json" \
  -d '{"seed":true}' \
  "http://localhost:5173/api/photos"
```

## Photo Management

- Photos with missing `blobUrl` are **automatically excluded** from API responses
- Frontend **never** receives photos without valid URLs
- Admin UI gracefully handles edge cases
- No infinite retries or polling loops
