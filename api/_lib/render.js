/**
 * Server-side HTML rendering helper for admin panel
 * Serverless-safe: no filesystem access, uses only blobUrl
 */

function escapeHtml(text) {
  if (text == null) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

export function renderLayout(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Admin Panel</title>
  <link rel="stylesheet" href="/admin/styles.css">
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>📸 Photobooth Admin</h1>
      <nav>
        <a href="/admin/photos">Photos</a>
      </nav>
    </header>
    <main class="admin-main">
      ${content}
    </main>
  </div>
</body>
</html>`;
}

export function renderDashboard() {
  const content = `
    <div class="dashboard">
      <div class="dashboard-content">
        <h2>Admin Dashboard</h2>
        <div class="dashboard-cards">
          <a href="/admin/photos" class="dashboard-card">
            <div class="dashboard-card-icon">📸</div>
            <div class="dashboard-card-title">Photo Management</div>
            <div class="dashboard-card-description">View, download, and delete captured photos</div>
          </a>
        </div>
        <div class="dashboard-links">
          <a href="/uploads" class="dashboard-link" target="_blank">Open Uploads</a>
        </div>
      </div>
    </div>
  `;

  return renderLayout("Admin", content);
}

export function renderPhotosList(photos, pagination, searchQuery) {
  const { page, limit, total, totalPages } = pagination;
  
  let content = `
    <div class="photos-header">
      <h2>Photo Management</h2>
      <form method="GET" action="/admin/photos" class="search-form">
        <input 
          type="text" 
          name="q" 
          placeholder="Search by filename..." 
          value="${escapeHtml(searchQuery || "")}"
          class="search-input"
        >
        <button type="submit" class="btn btn-primary">Search</button>
        ${searchQuery ? `<a href="/admin/photos" class="btn btn-secondary">Clear</a>` : ""}
      </form>
    </div>
  `;

  // Filter out photos without blobUrl and show count
  const photosWithBlob = photos.filter((p) => p.blobUrl && typeof p.blobUrl === "string");
  const photosWithoutBlob = photos.filter((p) => !p.blobUrl || typeof p.blobUrl !== "string");

  if (photos.length === 0) {
    content += `<div class="empty-state">No photos found.</div>`;
  } else {
    if (photosWithoutBlob.length > 0) {
      content += `<div class="warning" style="background: #fff3cd; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; color: #856404;">
        Note: ${photosWithoutBlob.length} photo(s) without blobUrl (skipped from display)
      </div>`;
    }

    if (photosWithBlob.length === 0) {
      content += `<div class="empty-state">No photos with valid blobUrl found.</div>`;
    } else {
      content += `
        <div class="table-container">
          <table class="photos-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Original Name</th>
                <th>MIME Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;

      photosWithBlob.forEach((photo) => {
        const sizeKB = ((photo.size || 0) / 1024).toFixed(2);
        const uploadDate = new Date(photo.createdAt).toLocaleString();
        const previewUrl = photo.blobUrl; // Only use blobUrl, no filesystem paths
        const viewUrl = previewUrl;
        const downloadUrl = `/admin/photos/${photo.id}/download`;
        const deleteUrl = `/admin/photos/${photo.id}/delete`;

        content += `
          <tr>
            <td>
              <img src="${escapeHtml(previewUrl)}" alt="Preview" class="photo-thumbnail" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
              <span style="display:none; color: #999;">No preview</span>
            </td>
            <td class="filename">${escapeHtml(photo.originalName || "unnamed")}</td>
            <td>${escapeHtml(photo.mimeType || "unknown")}</td>
            <td>${sizeKB} KB</td>
            <td>${escapeHtml(uploadDate)}</td>
            <td class="actions">
              <a href="${escapeHtml(viewUrl)}" target="_blank" class="btn btn-sm btn-view">View</a>
              <a href="${escapeHtml(downloadUrl)}" class="btn btn-sm btn-download">Download</a>
              <form method="POST" action="${escapeHtml(deleteUrl)}" style="display: inline;" onsubmit="return confirm('Are you sure you want to delete this photo?');">
                <button type="submit" class="btn btn-sm btn-danger">Delete</button>
              </form>
            </td>
          </tr>
        `;
      });

      content += `
            </tbody>
          </table>
        </div>
      `;
    }

    // Pagination
    if (totalPages > 1) {
      content += `<div class="pagination">`;
      
      if (page > 1) {
        const prevParams = new URLSearchParams();
        prevParams.set("page", String(page - 1));
        prevParams.set("limit", String(limit));
        if (searchQuery) prevParams.set("q", searchQuery);
        content += `<a href="/admin/photos?${prevParams.toString()}" class="btn btn-secondary">← Previous</a>`;
      }

      content += `<span class="page-info">Page ${page} of ${totalPages} (${total} total)</span>`;

      if (page < totalPages) {
        const nextParams = new URLSearchParams();
        nextParams.set("page", String(page + 1));
        nextParams.set("limit", String(limit));
        if (searchQuery) nextParams.set("q", searchQuery);
        content += `<a href="/admin/photos?${nextParams.toString()}" class="btn btn-secondary">Next →</a>`;
      }

      content += `</div>`;
    }
  }

  return renderLayout("Photos", content);
}
