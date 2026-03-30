"use client";

/**
 * GenerateButton — triggers batch thumbnail generation.
 *
 * States:
 *   - idle:       "Generate Thumbnails" — crimson #BF2031
 *   - generating: "Generating… (X / Y)" — spinner, non-interactive
 *   - disabled:   grayed — with title tooltip explaining why
 *
 * Disabled conditions (all must pass to enable):
 *   - API key is non-empty
 *   - Model is selected
 *   - At least one valid tag exists
 */

import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  progress: { done: number; total: number } | null;
  disabled: boolean;
  disabledReason?: string;
}

export default function GenerateButton({
  onClick,
  isGenerating,
  progress,
  disabled,
  disabledReason,
}: GenerateButtonProps) {
  const isDisabled = disabled || isGenerating;

  const label = isGenerating
    ? `Generating… (${progress?.done ?? 0} / ${progress?.total ?? 0})`
    : "Generate Thumbnails";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isGenerating}
      title={!isGenerating && disabled && disabledReason ? disabledReason : undefined}
      className={[
        "w-full rounded-md px-4 py-2.5 text-sm font-medium text-white",
        "flex items-center justify-center gap-2",
        "transition-colors duration-150",
        isDisabled
          ? "bg-gray-300 cursor-not-allowed"
          : "bg-brand-red hover:bg-brand-red-hover active:bg-brand-red-hover",
        "focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2",
      ].join(" ")}
    >
      {isGenerating && <Loader2 size={16} className="animate-spin flex-shrink-0" />}
      {label}
    </button>
  );
}
