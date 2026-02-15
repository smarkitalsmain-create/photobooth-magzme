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
  hasUrl?: boolean;
}

// Component for photo card with error handling
const PhotoCard = ({ photo, onDownload, onDelete, formatSize, formatDate }: {
  photo: Photo;
  onDownload: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
  formatSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
}) => {
  const [imageError, setImageError] = useState(false);
  const photoUrl = photo.blobUrl || "";
  const hasUrl = photoUrl.trim() !== "";
  const isValidVercelUrl = photoUrl.includes("vercel-storage.com");

  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 flex flex-col gap-3">
      {/* Preview image - show for all photos with URL, even if not Vercel */}
      {hasUrl ? (
        <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {!imageError ? (
            <img
              src={photoUrl}
              alt={photo.originalName}
              className="w-full h-full object-cover"
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50">
              <p className="text-xs text-muted-foreground text-center px-2">
                Preview unavailable
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
          <p className="text-xs text-muted-foreground text-center px-2">
            No preview URL
          </p>
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
          onClick={() => onDownload(photo)}
          disabled={!isValidVercelUrl}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-display hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={() => onDelete(photo)}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-display hover:opacity-90"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

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
        fetchPhotos(50);
      }
    }
  }, []);

  const fetchPhotos = async (limit: number = 50) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use API base URL from env if available
      const base = import.meta.env.VITE_API_BASE_URL || "";
      
      // Create AbortController for timeout (20 seconds to avoid false failures)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      let response;
      try {
        // Fetch absolute API route
        response = await fetch(`${base}/api/photos?op=list&limit=${limit}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          setError("Request timed out. Please try again.");
          setLoading(false);
          return;
        }
        setError("Network error. Please check your connection and try again.");
        setLoading(false);
        return;
      }
      
      // Check if response is OK (non-200 responses)
      if (!response.ok) {
        let errorMessage = `Failed to fetch photos: ${response.status}`;
        try {
          const errorText = await response.text();
          // Try to parse as JSON for better error message
          try {
            const errorData = JSON.parse(errorText);
            // Handle timeout and error messages from API
            if (errorData.error === "PHOTO_LIST_TIMEOUT" || errorData.error === "TIMEOUT") {
              errorMessage = "Request timed out. Please try again.";
            } else if (errorData.error) {
              errorMessage = errorData.error;
              if (errorData.message) {
                errorMessage += `: ${errorData.message}`;
              }
            } else {
              errorMessage = errorData.message || errorMessage;
            }
          } catch {
            // Not JSON, use text as-is if it's short
            if (errorText && errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        } catch {
          // Failed to read error text, use default
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Check content type to ensure we got JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setError("Server returned non-JSON response. Please check the API endpoint.");
        setLoading(false);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        setError("Failed to parse server response. The API may have returned invalid JSON.");
        setLoading(false);
        return;
      }
      
      // Strict parsing: expect { items: [...] } format
      if (!data || typeof data !== "object") {
        setError("Invalid response format: expected object");
        setLoading(false);
        return;
      }
      
      // Extract items array - do NOT look for data.photos, data.data, etc.
      const items = Array.isArray(data.items) ? data.items : [];
      
      // Debug logging (dev mode only)
      if (import.meta.env.DEV) {
        console.log("[photos] fetched", items.length, data);
      }
      
      // Map items to Photo format
      // Do NOT filter by size, storagePath, or URL type
      // Only require that blobUrl exists (even if it's not a Vercel URL)
      const mappedPhotos = items.map((item: any) => {
        const url = item.blobUrl || "";
        return {
          id: item.id,
          originalName: `Photo ${item.id.slice(0, 8)}`,
          mimeType: "image/jpeg",
          size: item.size ?? 0,
          createdAt: item.createdAt,
          blobUrl: url,
          url: url, // Keep for backward compatibility
          hasUrl: !!url && url.trim() !== "",
        };
      });
      
      setPhotos(mappedPhotos);
    } catch (err) {
      console.error("Error fetching photos:", err);
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (photo: Photo) => {
    try {
      // Use blobUrl (canonical field)
      const blobUrl = photo.blobUrl;
      
      // Guard against invalid/test photos - must be Vercel Blob URL
      if (!blobUrl || !blobUrl.includes("vercel-storage.com")) {
        alert("Invalid or test photo. This photo cannot be downloaded.");
        return;
      }
      
      // Browser-native download (no fetch, no CORS issues)
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      // If download fails (rare), show user-friendly message
      alert("Unable to download file. Please re-upload.");
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
      fetchPhotos(50);
    } catch (err) {
      console.error("Error deleting photo:", err);
      alert("Failed to delete photo. You may need to authenticate.");
    }
  };

  const handleCleanupLegacy = async () => {
    if (!confirm("Delete all legacy photos (missing URL)? This cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const base = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(`${base}/api/photos`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Cleanup failed" }));
        throw new Error(errorData.error || `Cleanup failed: ${response.status}`);
      }

      const result = await response.json();
      alert(`Successfully deleted ${result.deletedCount} legacy photo(s).`);
      
      // Refresh the list
      fetchPhotos(50);
    } catch (err) {
      console.error("Error cleaning up legacy photos:", err);
      setError(err instanceof Error ? err.message : "Failed to clean up legacy photos");
    } finally {
      setLoading(false);
    }
  };

  // Count legacy photos (photos without URL)
  const legacyCount = photos.filter((photo) => !photo.hasUrl).length;

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
            <div className="flex items-center gap-2">
              {legacyCount > 0 && (
                <button
                  onClick={handleCleanupLegacy}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-display hover:opacity-90"
                >
                  Clean legacy rows
                </button>
              )}
              <button
                onClick={() => fetchPhotos(50)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-display hover:opacity-90"
              >
                Refresh
              </button>
            </div>
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
              No photos available.
            </div>
          )}

          {!loading && !error && photos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  formatSize={formatSize}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPhotos;
