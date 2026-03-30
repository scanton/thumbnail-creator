"use client";

/**
 * Main page — the entire app lives here.
 *
 * Layout: split two-column on desktop (lg+), stacked on mobile.
 *   Left:  form panel (320px fixed) — API key, model, tags, prompt, generate button
 *   Right: gallery panel (flex-1) — thumbnails appear as each resolves
 *
 * Generation flow:
 *   1. Parse tags from the input
 *   2. Show a placeholder card for each tag immediately
 *   3. Fire one POST /api/generate per tag in parallel
 *   4. On 429: that tag retries with exponential backoff (1s, 2s, 4s)
 *   5. Each card updates individually as its request resolves
 *   6. After all tags complete, reload the full gallery from /api/thumbnails
 */

import { useState, useEffect, useCallback } from "react";
import ApiKeyInput from "@/components/ApiKeyInput";
import ModelSelector from "@/components/ModelSelector";
import TagInput from "@/components/TagInput";
import PromptTemplateInput, {
  DEFAULT_PROMPT_TEMPLATE,
} from "@/components/PromptTemplateInput";
import GenerateButton from "@/components/GenerateButton";
import ThumbnailGallery, {
  ThumbnailResult,
  ThumbnailStatus,
} from "@/components/ThumbnailGallery";
import { parseTags } from "@/lib/sanitize";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredThumbnail {
  url: string;
  filename: string;
  tag: string;
  uploadedAt: string;
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function generateWithRetry(
  tag: string,
  model: string,
  apiKey: string,
  promptTemplate: string
): Promise<Response> {
  const RETRY_DELAYS = [1000, 2000, 4000];

  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ tag, model, promptTemplate }),
    });

    if (response.status !== 429) return response;

    lastResponse = response;
    if (attempt < RETRY_DELAYS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  return lastResponse!;
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Home() {
  // Form state
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [tags, setTags] = useState("");
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT_TEMPLATE);

  // Error state for API key (set when we get a 401)
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<ThumbnailResult[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Persisted gallery state (loaded from /api/thumbnails on mount)
  const [storedThumbnails, setStoredThumbnails] = useState<ThumbnailResult[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // ── Load persisted thumbnails on mount ──────────────────────────────────
  const loadStoredThumbnails = useCallback(async () => {
    try {
      const res = await fetch("/api/thumbnails");
      if (!res.ok) return;
      const json = await res.json();
      const stored: StoredThumbnail[] = json.thumbnails ?? [];
      setStoredThumbnails(
        stored.map((t) => ({
          tag: t.tag,
          status: "success" as ThumbnailStatus,
          url: t.url,
        }))
      );
    } catch {
      // Non-fatal: gallery just stays empty on load error
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredThumbnails();
  }, [loadStoredThumbnails]);

  // ── Derived state ────────────────────────────────────────────────────────
  const { valid: validTags } = parseTags(tags);
  const canGenerate = !!apiKey && !!model && validTags.length > 0 && !isGenerating;
  const disabledReason = !apiKey
    ? "Enter your API key to generate"
    : !model
    ? "Select a model to generate"
    : validTags.length === 0
    ? "Add at least one valid tag to generate"
    : undefined;

  // ── Generation logic ─────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!canGenerate) return;

    setApiKeyError(undefined);
    setIsGenerating(true);
    setProgress({ done: 0, total: validTags.length });

    // Initialize placeholder cards for each tag immediately
    const placeholders: ThumbnailResult[] = validTags.map((tag) => ({
      tag,
      status: "loading",
    }));
    setGenerationResults(placeholders);

    let done = 0;

    // Fire all requests in parallel — each updates its card independently
    await Promise.all(
      validTags.map(async (tag) => {
        // Show retrying state if we go into backoff
        function markRetrying() {
          setGenerationResults((prev) =>
            prev.map((r) => (r.tag === tag ? { ...r, status: "retrying" } : r))
          );
        }

        let response: Response;
        try {
          // The retry helper handles 429 backoff; it calls markRetrying on first retry
          response = await generateWithRetryWithCallback(
            tag,
            model,
            apiKey,
            promptTemplate,
            markRetrying
          );
        } catch {
          setGenerationResults((prev) =>
            prev.map((r) =>
              r.tag === tag
                ? { ...r, status: "error", error: "Network error — check your connection" }
                : r
            )
          );
          done++;
          setProgress({ done, total: validTags.length });
          return;
        }

        const json = await response.json();

        if (!response.ok && response.status !== 207) {
          // Check for 401 — update the API key field error
          if (response.status === 401 || json.code === "INVALID_API_KEY") {
            setApiKeyError("Invalid API key — check your xAI dashboard at console.x.ai");
          }
          setGenerationResults((prev) =>
            prev.map((r) =>
              r.tag === tag
                ? {
                    ...r,
                    status: "error",
                    error: json.error,
                    errorCode: json.code,
                  }
                : r
            )
          );
        } else if (json.code === "BLOB_UPLOAD_FAILED" && json.tempUrl) {
          // Partial success: image generated but not stored — show with expiry warning
          setGenerationResults((prev) =>
            prev.map((r) =>
              r.tag === tag
                ? { ...r, status: "temp", tempUrl: json.tempUrl }
                : r
            )
          );
        } else {
          setGenerationResults((prev) =>
            prev.map((r) =>
              r.tag === tag ? { ...r, status: "success", url: json.url } : r
            )
          );
        }

        done++;
        setProgress({ done, total: validTags.length });
      })
    );

    setIsGenerating(false);
    setProgress(null);

    // Reload the full gallery so newly generated thumbnails are included
    await loadStoredThumbnails();
  }

  async function handleRetry(tag: string) {
    if (!apiKey || !model) return;

    setGenerationResults((prev) =>
      prev.map((r) => (r.tag === tag ? { ...r, status: "loading" } : r))
    );

    let response: Response;
    try {
      response = await generateWithRetry(tag, model, apiKey, promptTemplate);
    } catch {
      setGenerationResults((prev) =>
        prev.map((r) =>
          r.tag === tag
            ? { ...r, status: "error", error: "Network error — check your connection" }
            : r
        )
      );
      return;
    }

    const json = await response.json();

    if (!response.ok && response.status !== 207) {
      setGenerationResults((prev) =>
        prev.map((r) =>
          r.tag === tag
            ? { ...r, status: "error", error: json.error, errorCode: json.code }
            : r
        )
      );
    } else if (json.code === "BLOB_UPLOAD_FAILED" && json.tempUrl) {
      setGenerationResults((prev) =>
        prev.map((r) =>
          r.tag === tag ? { ...r, status: "temp", tempUrl: json.tempUrl } : r
        )
      );
    } else {
      setGenerationResults((prev) =>
        prev.map((r) =>
          r.tag === tag ? { ...r, status: "success", url: json.url } : r
        )
      );
      await loadStoredThumbnails();
    }
  }

  // ── Display logic ─────────────────────────────────────────────────────────
  // During and after generation, show the current batch results.
  // When idle with no active batch, show the persisted gallery.
  const displayResults =
    generationResults.length > 0 ? generationResults : storedThumbnails;

  const showInitialLoading = isInitialLoading && generationResults.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Form panel */}
      <aside className="w-full lg:w-80 lg:flex-shrink-0 p-6 border-b lg:border-b-0 lg:border-r border-[#e4e4e7] flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-[#1a1a1a]">
            Thumbnail Creator
          </h1>
          <p className="text-xs text-[#6e6d6a] mt-0.5">
            Powered by xAI image generation
          </p>
        </div>

        <ApiKeyInput
          value={apiKey}
          onChange={(key) => {
            setApiKey(key);
            setApiKeyError(undefined); // clear error when key changes
          }}
          error={apiKeyError}
        />

        <ModelSelector
          apiKey={apiKey}
          value={model}
          onChange={setModel}
        />

        <TagInput value={tags} onChange={setTags} />

        <PromptTemplateInput
          value={promptTemplate}
          onChange={setPromptTemplate}
        />

        <GenerateButton
          onClick={handleGenerate}
          isGenerating={isGenerating}
          progress={progress}
          disabled={!canGenerate}
          disabledReason={disabledReason}
        />
      </aside>

      {/* Gallery panel */}
      <main className="flex-1 p-6 overflow-y-auto">
        <ThumbnailGallery
          results={displayResults}
          onRetry={handleRetry}
          isInitialLoading={showInitialLoading}
        />
      </main>
    </div>
  );
}

// ─── Retry with callback ──────────────────────────────────────────────────────
// Same as generateWithRetry but calls onRetry() before the first backoff delay,
// so the card can show "Retrying…" state.

async function generateWithRetryWithCallback(
  tag: string,
  model: string,
  apiKey: string,
  promptTemplate: string,
  onRetry: () => void
): Promise<Response> {
  const RETRY_DELAYS = [1000, 2000, 4000];
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ tag, model, promptTemplate }),
    });

    if (response.status !== 429) return response;

    lastResponse = response;
    if (attempt < RETRY_DELAYS.length) {
      if (attempt === 0) onRetry(); // mark card as "Retrying…" on first backoff
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  return lastResponse!;
}
