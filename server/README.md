# Photobooth Server

Express server with Prisma, multer, and admin panel for managing photos.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `server` directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/photobooth?schema=public"

   # Server
   PORT=5050
   NODE_ENV=development

   # Admin Authentication
   ADMIN_USER=admin
   ADMIN_PASS=change_this_password
   ```

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5050`

## Endpoints

### Public API

- `POST /api/photos/upload` - Upload a photo
- `GET /api/photos` - List photos
- `GET /api/photos/:id` - Get photo by ID
- `GET /uploads/:filename` - Serve uploaded photos (static)

### Admin Panel (HTTP Basic Auth Required)

- `GET /admin` - Redirects to `/admin/photos`
- `GET /admin/photos` - List photos with pagination and search
- `GET /admin/photos/:id` - Photo detail view
- `GET /admin/photos/:id/download` - Download photo as attachment
- `POST /admin/photos/:id/delete` - Delete photo

## Testing

### Upload a photo:
```bash
curl -X POST http://localhost:5050/api/photos/upload \
  -F "photo=@/path/to/image.jpg"
```

### Access admin panel:
Open `http://localhost:5050/admin/photos` in your browser.
You'll be prompted for Basic Auth credentials (use ADMIN_USER and ADMIN_PASS from .env).
