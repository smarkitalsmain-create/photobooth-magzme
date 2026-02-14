import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Trash2, Image as ImageIcon } from "lucide-react";

interface Photo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
  blobUrl?: string;
}

const AdminPhotos = () => {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check auth (same as Admin.tsx)
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("magzme_admin_authed");
      if (stored === "true") {
        setIsAuthed(true);
        fetchPhotos();
      }
    }
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create AbortController for timeout (10 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      let response;
      try {
        // Fetch ONLY /api/photos/list (not /admin/photos, not /photos, not absolute domain)
        response = await fetch("/api/photos/list?limit=100", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw fetchError;
      }
      
      // Check if response is OK (non-200 responses)
      if (!response.ok) {
        const errorText = await response.text();
        // Try to parse as JSON for better error message
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Failed to fetch photos: ${response.status}`);
        } catch {
          throw new Error(`Failed to fetch photos: ${response.status} ${response.statusText}`);
        }
      }

      // Check content type to ensure we got JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response. Please check the API endpoint.");
      }

      const data = await response.json();
      
      // Expect { photos: [...] } format
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format: expected object");
      }
      
      if (!Array.isArray(data.photos)) {
        throw new Error("Invalid response format: photos field must be an array");
      }
      
      setPhotos(data.photos);
    } catch (err) {
      console.error("Error fetching photos:", err);
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (photo: Photo) => {
    try {
      // Use blobUrl if available, otherwise use url
      const photoUrl = photo.blobUrl || photo.url;
      if (!photoUrl) {
        alert("Photo URL not available");
        return;
      }
      
      // For download, we can use the admin download endpoint or direct blob URL
      // Using direct blob URL for simplicity
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.originalName || `photo-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading photo:", err);
      alert("Failed to download photo");
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm(`Are you sure you want to delete "${photo.originalName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/admin/photos/${photo.id}/delete`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      // Refresh the list
      fetchPhotos();
    } catch (err) {
      console.error("Error deleting photo:", err);
      alert("Failed to delete photo. You may need to authenticate.");
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-background grain-overlay flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card/80 border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <p className="text-sm text-muted-foreground text-center">
            Please log in through the Admin page first.
          </p>
          <button
            onClick={() => navigate("/admin")}
            className="w-full bg-primary text-primary-foreground font-display py-2.5 rounded-xl retro-shadow"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background grain-overlay flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-display text-xl text-primary">Photo Management</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl text-foreground flex items-center gap-2">
              <ImageIcon className="w-6 h-6" />
              Captured Photos
            </h1>
            <button
              onClick={fetchPhotos}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-display hover:opacity-90"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div className="text-center py-12 text-muted-foreground">Loading photos...</div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && photos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No photos found. Capture some photos to see them here!
            </div>
          )}

          {!loading && !error && photos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => {
                const photoUrl = photo.blobUrl || photo.url;
                return (
                  <div
                    key={photo.id}
                    className="rounded-xl border border-border bg-card/80 p-4 flex flex-col gap-3"
                  >
                    {photoUrl && (
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={photoUrl}
                          alt={photo.originalName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {photo.originalName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatSize(photo.size)} • {formatDate(photo.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(photo)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-display hover:opacity-90"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(photo)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-display hover:opacity-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPhotos;
