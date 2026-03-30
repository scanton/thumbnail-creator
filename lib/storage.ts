/**
 * Vercel Blob Storage helpers — thumbnail upload and listing.
 *
 * All thumbnails are stored as: thumbnail_{sanitized-tag}.png
 * The BLOB_READ_WRITE_TOKEN env var is validated at module load so misconfiguration
 * is caught at startup with a clear error, not at request time.
 */

import { put, list } from "@vercel/blob";

// Validate at module load — fail fast with a useful message instead of a cryptic 401 later
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error(
    "Missing BLOB_READ_WRITE_TOKEN environment variable. " +
      "Create a Blob Store in your Vercel project and add the token to your environment."
  );
}

export interface StoredThumbnail {
  url: string;
  filename: string;
  /** Tag name derived from the filename (strips "thumbnail_" prefix and ".png" suffix) */
  tag: string;
  uploadedAt: Date;
}

/**
 * Checks whether a thumbnail already exists in Blob Storage.
 * Used for idempotency: if the thumbnail was already generated and uploaded,
 * return the existing URL instead of calling xAI again (saves API cost).
 *
 * Returns the existing public URL, or null if not found.
 */
export async function headThumbnail(filename: string): Promise<string | null> {
  const { blobs } = await list({ prefix: filename, limit: 1 });
  return blobs.length > 0 ? blobs[0].url : null;
}

/**
 * Uploads a thumbnail image to Vercel Blob Storage.
 *
 * Accepts either a URL (streamed directly) or a Buffer (pre-decoded b64).
 * The blob is marked public so next/image can load it without auth.
 *
 * @param filename  e.g. "thumbnail_summer-fun.png"
 * @param source    Either a URL string (fetched and streamed) or a Buffer
 * @returns         The public Blob URL
 */
export async function uploadThumbnail(
  filename: string,
  source: string | Buffer
): Promise<string> {
  let body: Buffer | ReadableStream<Uint8Array>;
  let contentType = "image/png";

  if (typeof source === "string") {
    // Source is a temporary xAI URL — stream the response body directly to Blob
    const imageResponse = await fetch(source);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch image from xAI temp URL: ${imageResponse.status}`
      );
    }
    body = imageResponse.body as ReadableStream<Uint8Array>;
  } else {
    body = source;
  }

  const blob = await put(filename, body, {
    access: "public",
    contentType,
    // Overwrite if a file with the same name exists (re-generation scenario)
    addRandomSuffix: false,
  });

  return blob.url;
}

/**
 * Lists all stored thumbnails, sorted newest-first.
 * Limited to 50 results (sufficient for a reference app demo).
 */
export async function listThumbnails(): Promise<StoredThumbnail[]> {
  const { blobs } = await list({ prefix: "thumbnail_", limit: 50 });

  const thumbnails: StoredThumbnail[] = blobs.map((blob) => {
    // Derive the tag name from the filename: "thumbnail_summer-fun.png" → "summer-fun"
    const filename = blob.pathname;
    const tag = filename.replace(/^thumbnail_/, "").replace(/\.png$/, "");
    return {
      url: blob.url,
      filename,
      tag,
      uploadedAt: new Date(blob.uploadedAt),
    };
  });

  // Newest first — most recently generated thumbnails appear at the top of the gallery
  return thumbnails.sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
  );
}
