export const config = { runtime: "nodejs" };

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms)),
  ]);
}

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    const limitRaw = req.query?.limit;
    const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 50) || 50));

    const { default: prisma } = await import("../_lib/prisma.js");

    const photos = await withTimeout(
      prisma.photo.findMany({
        where: {
          blobUrl: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, blobUrl: true, createdAt: true },
      }),
      5000
    );

    // Filter out any null blobUrl (defensive)
    const validPhotos = photos.filter((photo) => photo.blobUrl && photo.blobUrl.trim() !== "");

    // Return blobUrl directly (canonical field)
    const items = validPhotos.map((photo) => ({
      id: photo.id,
      blobUrl: photo.blobUrl,
      createdAt: photo.createdAt,
    }));

    res.status(200).end(JSON.stringify({ items }));
  } catch (err) {
    const isTimeout = String(err?.message || "").includes("TIMEOUT");
    // On timeout, return empty list instead of error (fail-safe)
    if (isTimeout) {
      res.status(200).end(JSON.stringify({ items: [] }));
      return;
    }
    // On other errors, return error JSON
    res
      .status(500)
      .end(
        JSON.stringify({
          error: "PHOTO_LIST_ERROR",
          message: err?.message || String(err),
        })
      );
  }
}
