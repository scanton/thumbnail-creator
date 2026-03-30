"use client";

/**
 * ThumbnailGallery — displays generated thumbnails in a responsive grid.
 *
 * Grid: 1 col (mobile) → 2 col (sm) → 3 col (xl)
 * Sorted newest-first (handled by the page before passing results).
 *
 * Per-card states:
 *   - loading:   skeleton pulse + tag name
 *   - retrying:  spinner + "Retrying…" label
 *   - success:   next/image thumbnail + tag name + download link
 *   - temp:      image from xAI temp URL + amber "Expires soon" badge
 *   - error:     red error card + tag name + error message + retry button
 *
 * Initial empty state (no thumbnails at all):
 *   - Dashed-border empty state with instructions
 */

import Image from "next/image";
import { Download, RefreshCw, Clock } from "lucide-react";

// 1×1 gray pixel — used as blur placeholder for next/image
const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export type ThumbnailStatus =
  | "loading"
  | "retrying"
  | "success"
  | "temp"
  | "error";

export interface ThumbnailResult {
  tag: string;
  status: ThumbnailStatus;
  url?: string;
  tempUrl?: string;
  error?: string;
  errorCode?: string;
}

interface ThumbnailGalleryProps {
  results: ThumbnailResult[];
  onRetry?: (tag: string) => void;
  /** True while the initial thumbnail list is being fetched from /api/thumbnails */
  isInitialLoading?: boolean;
}

// Maps error codes from the API error envelope to human-readable messages.
// Using explicit mappings (not error.message) so the client controls the copy.
function errorMessage(code?: string, fallback?: string): string {
  switch (code) {
    case "INVALID_API_KEY":
      return "Invalid API key — check console.x.ai";
    case "RATE_LIMITED":
      return "Rate limited by xAI — retries exhausted";
    case "MODEL_NOT_FOUND":
      return "Model not found — try refreshing models";
    case "BLOB_UPLOAD_FAILED":
      return "Image generated but not saved — displayed temporarily";
    case "TAG_EMPTY":
      return "Tag was empty after cleaning — skipped";
    case "XAI_TIMEOUT":
      return "Generation timed out — try again";
    default:
      return fallback ?? "Generation failed — try again";
  }
}

export default function ThumbnailGallery({
  results,
  onRetry,
  isInitialLoading = false,
}: ThumbnailGalleryProps) {
  if (isInitialLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 rounded-lg border-2 border-dashed border-[#e4e4e7] text-center p-8">
        <p className="text-sm font-medium text-[#1a1a1a]">No thumbnails yet</p>
        <p className="text-xs text-[#6e6d6a] mt-1">
          Enter tags and click Generate Thumbnails to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {results.map((result) => (
        <ThumbnailCard key={result.tag} result={result} onRetry={onRetry} />
      ))}
    </div>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div>
      <div className="aspect-square rounded-md bg-gray-200 animate-pulse" />
      <div className="mt-2 h-4 w-20 rounded bg-gray-200 animate-pulse" />
    </div>
  );
}

function ThumbnailCard({
  result,
  onRetry,
}: {
  result: ThumbnailResult;
  onRetry?: (tag: string) => void;
}) {
  const { tag, status, url, tempUrl, error, errorCode } = result;
  const imageUrl = url ?? tempUrl;

  if (status === "loading") {
    return (
      <div>
        <div className="aspect-square rounded-md bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-xs text-[#6e6d6a]">{tag}</span>
        </div>
        <div className="mt-2 h-4 w-20 rounded bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (status === "retrying") {
    return (
      <div>
        <div className="aspect-square rounded-md bg-gray-100 flex flex-col items-center justify-center gap-2">
          <RefreshCw size={20} className="animate-spin text-[#6e6d6a]" />
          <span className="text-xs text-[#6e6d6a]">Retrying…</span>
        </div>
        <p className="mt-2 text-xs text-[#1a1a1a] truncate">{tag}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <div
          role="alert"
          className="aspect-square rounded-md bg-brand-red-light border border-brand-red/20 flex flex-col items-center justify-center gap-2 p-3"
        >
          <p className="text-xs text-brand-red text-center font-medium">{tag}</p>
          <p className="text-xs text-brand-red text-center">
            {errorMessage(errorCode, error)}
          </p>
          {onRetry && errorCode !== "TAG_EMPTY" && (
            <button
              type="button"
              onClick={() => onRetry(tag)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-brand-red underline hover:no-underline"
            >
              <RefreshCw size={11} /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // success or temp — both have an image URL
  if (!imageUrl) return null;

  return (
    <div>
      <div className="relative aspect-square rounded-md overflow-hidden">
        <Image
          src={imageUrl}
          alt={tag}
          fill
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        {status === "temp" && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
            <Clock size={11} />
            Expires soon
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#1a1a1a] truncate max-w-[80%]">{tag}</span>
        {status === "success" && (
          <a
            href={imageUrl}
            download={`thumbnail_${tag}.png`}
            aria-label={`Download ${tag} thumbnail`}
            className="flex items-center gap-1 text-xs text-[#6e6d6a] hover:text-[#1a1a1a]"
          >
            <Download size={13} />
          </a>
        )}
      </div>
      {status === "temp" && (
        <p
          role="status"
          className="text-xs text-amber-600 mt-0.5"
        >
          Not saved — image will expire
        </p>
      )}
    </div>
  );
}
