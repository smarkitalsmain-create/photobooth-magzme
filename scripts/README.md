# Photo Backfill Script

## Purpose
This script backfills photos with NULL `blobUrl` values by setting them to a placeholder `"MISSING_BLOB_URL"`.

## Usage

### 1. Set DATABASE_URL environment variable
```bash
export DATABASE_URL="your-neon-connection-string"
```

### 2. Run the backfill script
```bash
node scripts/backfill-photos.js
```

### 3. Verify the results
The script will:
- List all photos with NULL blobUrl
- Update them with placeholder value "MISSING_BLOB_URL"
- Report the count of updated rows

### 4. After backfill, make blobUrl required again
```bash
# Update schema.prisma: change blobUrl String? to blobUrl String
# Then run:
npx prisma migrate dev --name make_bloburl_required
```

## Important Notes
- This script does NOT delete any photos
- This script does NOT guess or hardcode fake URLs
- Placeholder value "MISSING_BLOB_URL" is used for legacy photos
- Admin UI will show "Legacy photo – URL not available" for these photos
