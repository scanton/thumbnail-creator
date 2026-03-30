/**
 * MSW request handlers — mock xAI and Vercel Blob for deterministic CI tests.
 *
 * Why MSW over Jest mocks?
 * MSW intercepts at the HTTP layer (fetch/XHR), so tests exercise the same
 * code paths that production hits. Mocking fetch() directly can silently skip
 * validation, headers, and error handling that only runs during real requests.
 */

import { http, HttpResponse } from "msw";

// ─── xAI handlers ─────────────────────────────────────────────────────────────

export const xaiHandlers = [
  // GET /v1/image-generation-models — returns a minimal model list
  http.get("https://api.x.ai/v1/image-generation-models", ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== "Bearer valid-test-key") {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return HttpResponse.json({
      data: [
        { id: "aurora", pricing: { per_image: 0.05 } },
        { id: "grok-2-image", pricing: { per_image: 0.07 } },
      ],
    });
  }),

  // POST /v1/images/generations — returns a fake image URL
  http.post("https://api.x.ai/v1/images/generations", async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== "Bearer valid-test-key") {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Simulate rate limiting for specific model
    if (body.model === "rate-limited-model") {
      return HttpResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    return HttpResponse.json({
      data: [{ url: "https://images.x.ai/test-image.png" }],
    });
  }),

  // xAI temp image URL — returns a 1×1 PNG
  http.get("https://images.x.ai/test-image.png", () => {
    // 1×1 transparent PNG bytes
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    return new HttpResponse(png, {
      headers: { "Content-Type": "image/png" },
    });
  }),
];

// ─── Vercel Blob handlers ──────────────────────────────────────────────────────

export const blobHandlers = [
  // list blobs
  http.get("https://blob.vercel-storage.com/", () => {
    return HttpResponse.json({
      blobs: [
        {
          url: "https://abc.public.blob.vercel-storage.com/thumbnail_summer.png",
          pathname: "thumbnail_summer",
          uploadedAt: new Date("2024-01-15T10:00:00Z").toISOString(),
        },
        {
          url: "https://abc.public.blob.vercel-storage.com/thumbnail_winter.png",
          pathname: "thumbnail_winter",
          uploadedAt: new Date("2024-01-14T10:00:00Z").toISOString(),
        },
      ],
      cursor: null,
      hasMore: false,
    });
  }),

  // put blob
  http.put("https://blob.vercel-storage.com/:filename", ({ params }) => {
    const filename = params.filename as string;
    return HttpResponse.json({
      url: `https://abc.public.blob.vercel-storage.com/${filename}`,
      pathname: filename,
      contentType: "image/png",
      uploadedAt: new Date().toISOString(),
    });
  }),
];

// ─── App API route handlers (for component tests) ────────────────────────────
// These mock the app's own API routes so components can be tested in isolation.

export const appHandlers = [
  http.get("http://localhost:3000/api/models", ({ request }) => {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== "valid-test-key") {
      return HttpResponse.json(
        { error: "Invalid API key", code: "INVALID_API_KEY" },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      models: [
        { id: "aurora", pricing: { per_image: 0.05 } },
        { id: "grok-2-image", pricing: { per_image: 0.07 } },
      ],
    });
  }),

  // Also handle relative URLs (jsdom resolves to http://localhost)
  http.get("/api/models", ({ request }) => {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== "valid-test-key") {
      return HttpResponse.json(
        { error: "Invalid API key", code: "INVALID_API_KEY" },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      models: [
        { id: "aurora", pricing: { per_image: 0.05 } },
        { id: "grok-2-image", pricing: { per_image: 0.07 } },
      ],
    });
  }),

  http.get("/api/thumbnails", () => {
    return HttpResponse.json({ thumbnails: [], total: 0 });
  }),
];

export const handlers = [...xaiHandlers, ...blobHandlers, ...appHandlers];
