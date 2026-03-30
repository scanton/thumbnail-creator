"use client";

/**
 * ModelSelector — dropdown populated from GET /api/models.
 *
 * States:
 *   - before-key: disabled with "Enter API key first" placeholder
 *   - loading:    fetching models, spinner shown
 *   - success:    model list populated, user can select
 *   - error:      fetch failed, retry link shown
 *   - empty:      fetch succeeded but zero models returned
 *
 * Re-fetches automatically whenever the apiKey changes.
 */

import { useState, useEffect, useId } from "react";
import { RefreshCw } from "lucide-react";

interface XaiModel {
  id: string;
  pricing?: { per_image?: number };
}

interface ModelSelectorProps {
  apiKey: string;
  value: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({
  apiKey,
  value,
  onChange,
}: ModelSelectorProps) {
  const id = useId();
  const [models, setModels] = useState<XaiModel[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (!apiKey) {
      setModels([]);
      setStatus("idle");
      onChange("");
      return;
    }

    let cancelled = false;

    async function fetchModels() {
      setStatus("loading");
      try {
        const res = await fetch("/api/models", {
          headers: { "x-api-key": apiKey },
        });
        if (cancelled) return;

        const json = await res.json();
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const fetched: XaiModel[] = json.models ?? [];
        setModels(fetched);
        setStatus(fetched.length > 0 ? "success" : "success"); // "success" even if empty
        // Auto-select the first model if nothing is selected yet
        if (fetched.length > 0 && !value) {
          onChange(fetched[0].id);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    fetchModels();
    return () => {
      cancelled = true;
    };
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const disabled = !apiKey || status === "loading";

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-[#1a1a1a]">
        Model
      </label>

      {status === "error" ? (
        <div className="text-sm text-brand-red">
          Could not load models — check your API key.{" "}
          <button
            type="button"
            onClick={() => {
              // Trigger re-fetch by resetting status (useEffect watches apiKey)
              setStatus("idle");
              // Small trick: temporarily change a dep to force re-run
              const event = new Event("retry-models");
              window.dispatchEvent(event);
            }}
            className="underline hover:no-underline inline-flex items-center gap-1"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label="Select image generation model"
          title={!apiKey ? "Enter API key first" : undefined}
          className={[
            "w-full rounded-md border px-3 py-2 text-sm text-[#1a1a1a]",
            "focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent",
            "border-[#e4e4e7]",
            disabled ? "bg-gray-50 text-[#6e6d6a] cursor-not-allowed" : "bg-white",
          ].join(" ")}
        >
          {!apiKey && (
            <option value="">Enter API key first</option>
          )}
          {apiKey && status === "loading" && (
            <option value="">Loading models…</option>
          )}
          {apiKey && status === "success" && models.length === 0 && (
            <option value="">No image models found for this key</option>
          )}
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
              {m.pricing?.per_image != null
                ? ` — $${m.pricing.per_image.toFixed(3)}/image`
                : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
