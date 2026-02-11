/**
 * Upload captured photo to backend
 */

export interface UploadResult {
  id: string;
  url: string;
  createdAt: string;
}

/**
 * Upload a captured photo to the backend
 * @param input - Blob or File to upload
 * @param filename - Optional filename (defaults to "photobooth-<timestamp>.png")
 * @returns Upload result with id, url, and createdAt
 * @throws Error if upload fails
 */
export async function uploadCapturedPhoto(
  input: Blob | File,
  filename?: string
): Promise<UploadResult> {
  // Convert Blob to File if needed
  const file =
    input instanceof File
      ? input
      : new File([input], filename || `photobooth-${Date.now()}.png`, {
          type: input.type || "image/png",
        });

  // Create FormData with "file" field
  const formData = new FormData();
  formData.append("file", file);

  // Upload with retry logic
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Upload failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        id: data.id,
        url: data.url,
        createdAt: data.createdAt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Wait 1 second before retry (except on last attempt)
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // All attempts failed
  throw new Error(lastError?.message || "Upload failed after retries");
}
