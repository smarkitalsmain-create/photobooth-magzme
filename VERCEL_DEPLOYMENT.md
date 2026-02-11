# Vercel Deployment Guide

## File Structure

```
/
├── api/
│   ├── _lib/
│   │   ├── basicAuth.js          # Basic Auth middleware
│   │   ├── prisma.js              # Prisma client singleton
│   │   └── render.js              # HTML rendering helpers
│   ├── admin/
│   │   ├── index.js               # GET /admin (dashboard)
│   │   ├── styles.css.js          # Admin CSS styles
│   │   └── photos/
│   │       ├── index.js           # GET /admin/photos (list)
│   │       └── [id]/
│   │           ├── download.js   # GET /admin/photos/:id/download
│   │           └── delete.js      # POST /admin/photos/:id/delete
│   └── photos/
│       └── upload.js              # POST /api/photos/upload
├── prisma/
│   └── schema.prisma              # Prisma schema (with blobUrl field)
├── vercel.json                    # Vercel rewrites configuration
└── package.json                   # Dependencies including @vercel/blob, busboy, prisma
```

## Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```env
# Required
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
ADMIN_USER="admin"
ADMIN_PASS="your_secure_password"
BLOB_READ_WRITE_TOKEN="vercel_blob_token"  # Get from Vercel Blob dashboard

# Optional
MAX_FILE_MB=10
NODE_ENV=production
```

## Database Migration

1. Update Prisma schema to include `blobUrl` field:
   ```bash
   cd /path/to/project
   npx prisma migrate dev --name add_blob_url
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

## Production Routes

After deployment, these routes will work:

- `https://photobooth.magzme.com/admin` → Admin dashboard
- `https://photobooth.magzme.com/admin/photos` → Photo management
- `https://photobooth.magzme.com/admin/photos/:id/download` → Download photo
- `https://photobooth.magzme.com/api/photos/upload` → Upload photo (frontend uses this)

## Key Changes from Express

1. **Storage**: Files stored in Vercel Blob instead of local filesystem
2. **Functions**: Serverless functions instead of Express server
3. **Routes**: Vercel rewrites map `/admin/*` to `/api/admin/*`
4. **Database**: Prisma client uses singleton pattern for serverless
5. **Auth**: Basic Auth implemented in helper function

## Notes

- Frontend uploads to `/api/photos/upload` (unchanged)
- Admin routes protected with Basic Auth (ADMIN_USER/ADMIN_PASS)
- Photos stored in Vercel Blob with public URLs
- Database metadata stored in Neon PostgreSQL
- No database credentials exposed to frontend
