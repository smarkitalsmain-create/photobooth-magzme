/**
 * Server-side HTML rendering helper for admin panel
 */

export const renderLayout = (title, content) => {
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
};

export const renderPhotosList = (photos, pagination, searchQuery) => {
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

  if (photos.length === 0) {
    content += `<div class="empty-state">No photos found.</div>`;
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

    photos.forEach((photo) => {
      const sizeKB = (photo.size / 1024).toFixed(2);
      const uploadDate = new Date(photo.createdAt).toLocaleString();
      const previewUrl = `/uploads/${photo.storagePath}`;
      const viewUrl = previewUrl;
      const downloadUrl = `/admin/photos/${photo.id}/download`;
      const deleteUrl = `/admin/photos/${photo.id}/delete`;

      content += `
        <tr>
          <td>
            <img src="${escapeHtml(previewUrl)}" alt="Preview" class="photo-thumbnail" loading="lazy">
          </td>
          <td class="filename">${escapeHtml(photo.originalName)}</td>
          <td>${escapeHtml(photo.mimeType)}</td>
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
};

export const renderPhotoDetail = (photo) => {
  const sizeKB = (photo.size / 1024).toFixed(2);
  const uploadDate = new Date(photo.createdAt).toLocaleString();
  const previewUrl = `/uploads/${photo.storagePath}`;
  const downloadUrl = `/admin/photos/${photo.id}/download`;

  const content = `
    <div class="photo-detail">
      <div class="photo-detail-header">
        <a href="/admin/photos" class="btn btn-secondary">← Back to List</a>
        <h2>Photo Details</h2>
      </div>
      <div class="photo-detail-content">
        <div class="photo-preview-large">
          <img src="${escapeHtml(previewUrl)}" alt="Photo preview" class="photo-large">
        </div>
        <div class="photo-metadata">
          <table class="metadata-table">
            <tr>
              <th>ID:</th>
              <td>${escapeHtml(photo.id)}</td>
            </tr>
            <tr>
              <th>Original Name:</th>
              <td>${escapeHtml(photo.originalName)}</td>
            </tr>
            <tr>
              <th>MIME Type:</th>
              <td>${escapeHtml(photo.mimeType)}</td>
            </tr>
            <tr>
              <th>Size:</th>
              <td>${sizeKB} KB (${photo.size} bytes)</td>
            </tr>
            <tr>
              <th>Uploaded:</th>
              <td>${escapeHtml(uploadDate)}</td>
            </tr>
            <tr>
              <th>Storage Path:</th>
              <td><code>${escapeHtml(photo.storagePath)}</code></td>
            </tr>
          </table>
          <div class="photo-actions">
            <a href="${escapeHtml(downloadUrl)}" class="btn btn-primary btn-large">Download Photo</a>
            <form method="POST" action="/admin/photos/${photo.id}/delete" style="display: inline;" onsubmit="return confirm('Are you sure you want to delete this photo?');">
              <button type="submit" class="btn btn-danger btn-large">Delete Photo</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  return renderLayout("Photo Detail", content);
};

/**
 * Escape HTML to prevent XSS
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
