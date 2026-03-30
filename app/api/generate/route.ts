/**
 * POST /api/generate
 *
 * Generates a single thumbnail for one tag, then stores it in Vercel Blob.
 * The client fires one request per tag in parallel.
 *
 * Pipeline:
 *   1. Validate inputs (tag, model, api key, prompt template)
 *   2. Sanitize tag → filename
 *   3. Idempotency check: if thumbnail already exists in Blob, return it
 *   4. Call xAI image generation API (45s sub-budget)
 *   5. Download image (URL) or decode base64 (b64_json)
 *   6. Upload to Vercel Blob (1 retry on failure)
 *   7. Return { url, tag, filename }
 *
 * All errors return: { error: string, code: string, tag?: string, tempUrl?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createXaiClient, XaiApiError } from "@/lib/xai";
import { sanitizeTag } from "@/lib/sanitize";
import { headThumbnail, uploadThumbnail } from "@/lib/storage";

// Serverless function timeout — requires Vercel Pro plan.
// Hobby plan silently ignores values above 10s.
export const maxDuration = 60;

const RequestBodySchema = z.object({
  tag: z.string().min(1).max(200),
  model: z.string().min(1),
  promptTemplate: z
    .string()
    .optional()
    .default(
      "Vibrant thumbnail image for the concept: {tag}. Subject fills the entire frame edge to edge — no whitespace or padding. Dynamic composition, bold colors, editorial photography style. Authentic and energetic, not corporate stock photo."
    ),
});

export async function POST(request: NextRequest) {
  // ── 1. Validate API key ───────────────────────────────────────────────────
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing x-api-key header", code: "MISSING_API_KEY" },
      { status: 400 }
    );
  }

  // ── 2. Validate request body ──────────────────────────────────────────────
  let body: z.infer<typeof RequestBodySchema>;
  try {
    const json = await request.json();
    body = RequestBodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const { tag: rawTag, model, promptTemplate } = body;

  // ── 3. Sanitize tag ───────────────────────────────────────────────────────
  const sanitizedTag = sanitizeTag(rawTag);
  if (!sanitizedTag) {
    return NextResponse.json(
      {
        error: `Tag "${rawTag}" is empty after sanitization`,
        code: "TAG_EMPTY",
        tag: rawTag,
      },
      { status: 400 }
    );
  }

  // ── 4. Validate prompt template contains {tag} placeholder ────────────────
  if (!promptTemplate.includes("{tag}")) {
    return NextResponse.json(
      {
        error: 'Prompt template must contain the {tag} placeholder',
        code: "INVALID_PROMPT_TEMPLATE",
      },
      { status: 400 }
    );
  }

  const filename = `thumbnail_${sanitizedTag}.png`;
  const prompt = promptTemplate.replace("{tag}", sanitizedTag);

  // ── 5. Idempotency check ──────────────────────────────────────────────────
  // If this thumbnail was already generated, return the existing URL.
  // This avoids duplicate xAI calls (and charges) if the function retried or
  // the user re-submits the same tag.
  const existingUrl = await headThumbnail(filename);
  if (existingUrl) {
    return NextResponse.json({ url: existingUrl, tag: sanitizedTag, filename });
  }

  // ── 6. Generate image via xAI ─────────────────────────────────────────────
  const xai = createXaiClient(apiKey);
  let tempUrl: string | undefined;

  let imageResult;
  try {
    // 45s sub-budget: leaves 15s for download + Blob upload within the 60s maxDuration
    imageResult = await xai.generateImage(model, prompt, 45_000);
    if (imageResult.type === "url") {
      tempUrl = imageResult.url;
    }
  } catch (error) {
    if (error instanceof XaiApiError) {
      if (error.status === 401) {
        return NextResponse.json(
          {
            error: "Invalid API key — check your xAI dashboard at console.x.ai",
            code: "INVALID_API_KEY",
            tag: sanitizedTag,
          },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          {
            error: "Rate limited by xAI",
            code: "RATE_LIMITED",
            tag: sanitizedTag,
          },
          { status: 429 }
        );
      }
      if (error.status === 404) {
        return NextResponse.json(
          {
            error: "Model not found — try refreshing the model list",
            code: "MODEL_NOT_FOUND",
            tag: sanitizedTag,
          },
          { status: 404 }
        );
      }
      // Log the full xAI error body so unexpected status codes are diagnosable
      console.error(
        `[/api/generate] xAI returned ${error.status} for tag "${sanitizedTag}" model "${model}":`,
        error.body
      );
      return NextResponse.json(
        {
          error: `xAI generation failed: ${error.status}`,
          code: "XAI_ERROR",
          tag: sanitizedTag,
        },
        { status: 502 }
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: "xAI generation timed out (45s). Try again.",
          code: "XAI_TIMEOUT",
          tag: sanitizedTag,
        },
        { status: 504 }
      );
    }
    console.error(`[/api/generate] xAI error for tag "${sanitizedTag}":`, error);
    return NextResponse.json(
      {
        error: "Image generation failed",
        code: "XAI_ERROR",
        tag: sanitizedTag,
      },
      { status: 500 }
    );
  }

  // ── 7. Upload to Vercel Blob (1 retry on failure) ─────────────────────────
  const source = imageResult.type === "url" ? imageResult.url : imageResult.data;
  let blobUrl: string;

  try {
    blobUrl = await uploadThumbnail(filename, source);
  } catch (uploadError) {
    // First upload attempt failed — retry once
    try {
      blobUrl = await uploadThumbnail(filename, source);
    } catch (retryError) {
      console.error(
        `[/api/generate] Blob upload failed for "${filename}":`,
        retryError
      );
      // Return the xAI temp URL so the client can display it temporarily
      return NextResponse.json(
        {
          error: "Image generated but could not be saved. Displaying temporarily.",
          code: "BLOB_UPLOAD_FAILED",
          tag: sanitizedTag,
          tempUrl,
        },
        { status: 207 } // 207 Multi-Status: partial success
      );
    }
  }

  return NextResponse.json({ url: blobUrl, tag: sanitizedTag, filename });
}
