/**
 * xAI API client — image generation and model listing.
 *
 * Pattern: createXaiClient(apiKey) returns a client bound to that key.
 * The API key is used for this request only and never stored beyond the call.
 *
 * xAI image generation docs: https://docs.x.ai/api/endpoints#image-generation
 */

import { z } from "zod";

const XAI_BASE_URL = "https://api.x.ai/v1";

// ─── Response schemas (Zod) ──────────────────────────────────────────────────
// Zod validates xAI responses at runtime. If xAI changes their API shape,
// we get a clear error instead of a silent undefined access.

const XaiModelSchema = z.object({
  id: z.string(),
  object: z.string().optional(),
  // Pricing may not always be present; include if available
  pricing: z
    .object({
      per_image: z.number().optional(),
    })
    .optional(),
});

// xAI /v1/image-generation-models returns { models: [...] } (not { data: [...] }).
// Accept both shapes so tests (which use the OpenAI-compat mock) and prod both work.
const XaiModelsResponseSchema = z.union([
  z.object({ models: z.array(XaiModelSchema) }),
  z.object({ data: z.array(XaiModelSchema) }),
]);

const XaiImageDataSchema = z.union([
  // xAI can return either a temporary URL or base64-encoded image data
  z.object({ url: z.string().url(), b64_json: z.undefined() }),
  z.object({ b64_json: z.string(), url: z.undefined() }),
]);

const XaiImageResponseSchema = z.object({
  data: z.array(XaiImageDataSchema).min(1),
});

// ─── Public types ─────────────────────────────────────────────────────────────

export interface XaiModel {
  id: string;
  pricing?: { per_image?: number };
}

/**
 * The result of a successful image generation.
 * Callers handle both formats: URL (must be downloaded immediately — expires) or
 * base64 bytes (decoded to Buffer for Blob upload).
 */
export type XaiImageResult =
  | { type: "url"; url: string }
  | { type: "b64"; data: Buffer };

// ─── Client factory ───────────────────────────────────────────────────────────

export function createXaiClient(apiKey: string) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  /**
   * Lists image-capable models from xAI.
   * Uses /v1/image-generation-models which returns only image models (not chat, etc.).
   */
  async function listModels(): Promise<XaiModel[]> {
    const response = await fetch(`${XAI_BASE_URL}/image-generation-models`, {
      headers,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new XaiApiError(response.status, body);
    }

    const json = await response.json();
    let parsed: z.infer<typeof XaiModelsResponseSchema>;
    try {
      parsed = XaiModelsResponseSchema.parse(json);
    } catch (err) {
      // Log the actual response shape to help diagnose API shape mismatches
      console.error("[xai] listModels: unexpected response shape", JSON.stringify(json));
      throw err;
    }
    const models = "models" in parsed ? parsed.models : parsed.data;
    return models.map((m) => ({ id: m.id, pricing: m.pricing }));
  }

  /**
   * Generates a single image for the given prompt.
   * Always requests 1024×1024 (square) with n=1.
   *
   * @param model  xAI model ID (e.g. "aurora")
   * @param prompt Full prompt string with the tag already substituted in
   * @param timeoutMs  Abort if xAI hasn't responded within this many ms (default 45s)
   */
  async function generateImage(
    model: string,
    prompt: string,
    timeoutMs = 45_000
  ): Promise<XaiImageResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${XAI_BASE_URL}/images/generations`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          response_format: "url", // prefer URL; xAI may return b64_json regardless
          size: "1024x1024",
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new XaiApiError(response.status, body);
    }

    const json = await response.json();
    const parsed = XaiImageResponseSchema.parse(json);
    const imageData = parsed.data[0];

    if (imageData.url) {
      // Validate the URL hostname to guard against SSRF — only allow *.x.ai
      const hostname = new URL(imageData.url).hostname;
      if (!hostname.endsWith(".x.ai")) {
        throw new Error(
          `SSRF guard: unexpected image hostname "${hostname}" (expected *.x.ai)`
        );
      }
      return { type: "url", url: imageData.url };
    }

    // b64_json path
    return {
      type: "b64",
      data: Buffer.from(imageData.b64_json!, "base64"),
    };
  }

  return { listModels, generateImage };
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class XaiApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string
  ) {
    super(`xAI API error ${status}: ${body}`);
    this.name = "XaiApiError";
  }
}
