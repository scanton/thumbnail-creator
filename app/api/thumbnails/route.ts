/**
 * GET /api/thumbnails
 *
 * Lists all stored thumbnails from Vercel Blob Storage.
 * Used to populate the gallery on page load and after generation.
 *
 * This is a shared namespace — all users of this deployment see the same thumbnails.
 * Acceptable for a reference app. In production, scope by user ID.
 *
 * Cached for 30s on Vercel's CDN to reduce Blob API calls.
 */

import { NextResponse } from "next/server";
import { listThumbnails } from "@/lib/storage";

// Cache the response for 30 seconds — thumbnail list doesn't change that often
export const revalidate = 30;

export async function GET() {
  try {
    const thumbnails = await listThumbnails();
    return NextResponse.json({ thumbnails, total: thumbnails.length });
  } catch (error) {
    console.error("[/api/thumbnails] Failed to list thumbnails:", error);
    return NextResponse.json(
      { error: "Failed to load thumbnails", code: "STORAGE_ERROR" },
      { status: 500 }
    );
  }
}
