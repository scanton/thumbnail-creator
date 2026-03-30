"use client";

/**
 * PromptTemplateInput — editable prompt template with {tag} placeholder.
 *
 * Collapsed by default to keep the form clean. Most users won't need to change it.
 * The {tag} placeholder is replaced with the sanitized tag name before sending to xAI.
 *
 * States:
 *   - collapsed:       shows "Prompt template [Edit ▾]" — one line
 *   - expanded-valid:  textarea with {tag} present — no warning
 *   - expanded-invalid: textarea with {tag} missing — amber warning shown
 */

import { useState, useId } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

export const DEFAULT_PROMPT_TEMPLATE =
  "Vibrant thumbnail image for the concept: {tag}. Subject fills the entire frame edge to edge — no whitespace or padding. Dynamic composition, bold colors, editorial photography style. Authentic and energetic, not corporate stock photo.";

interface PromptTemplateInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PromptTemplateInput({
  value,
  onChange,
}: PromptTemplateInputProps) {
  const id = useId();
  const warningId = `${id}-warning`;
  const [expanded, setExpanded] = useState(false);

  const missingPlaceholder = expanded && !value.includes("{tag}");

  return (
    <div className="space-y-1">
      {/* Header row — always visible */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#1a1a1a]">
          Prompt template
        </span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1 text-xs text-[#6e6d6a] hover:text-[#1a1a1a]"
          aria-expanded={expanded}
          aria-controls={id}
        >
          {expanded ? (
            <>
              Hide <ChevronUp size={12} />
            </>
          ) : (
            <>
              Edit <ChevronDown size={12} />
            </>
          )}
        </button>
      </div>

      {/* Expandable section */}
      {expanded && (
        <>
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            aria-describedby={missingPlaceholder ? warningId : undefined}
            className={[
              "w-full rounded-md border px-3 py-2 text-sm text-[#1a1a1a] resize-none",
              "focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent",
              missingPlaceholder
                ? "border-amber-400 bg-amber-50"
                : "border-[#e4e4e7]",
            ].join(" ")}
          />

          {missingPlaceholder && (
            <p id={warningId} role="status" className="text-xs text-amber-600">
              ⚠ Include <code className="font-mono">{"{tag}"}</code> in your
              template so each tag name gets inserted.
            </p>
          )}

          <button
            type="button"
            onClick={() => onChange(DEFAULT_PROMPT_TEMPLATE)}
            className="inline-flex items-center gap-1 text-xs text-[#6e6d6a] hover:text-[#1a1a1a]"
          >
            <RotateCcw size={11} /> Reset to default
          </button>
        </>
      )}
    </div>
  );
}
