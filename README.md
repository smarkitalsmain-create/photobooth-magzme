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

**Build:**
```bash
npm run build
```

This runs:
- `vite build` - Builds frontend
- `prisma generate` - Generates Prisma Client (via postinstall)

**No database writes during build** - migrations must be run separately.

## API Endpoints

- `GET /api/photos/list?limit=50` - List photos (filters out NULL blobUrl)
- `POST /api/photos/upload` - Upload new photo
- `GET /admin` - Admin dashboard (Basic Auth)
- `GET /admin/photos` - Photo management (Basic Auth)

## Photo Management

- Photos with missing `blobUrl` are **automatically excluded** from API responses
- Frontend **never** receives photos without valid URLs
- Admin UI gracefully handles edge cases
- No infinite retries or polling loops
