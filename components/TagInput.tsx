"use client";

/**
 * TagInput — comma-delimited tag entry.
 *
 * Parses and previews the tag list below the input.
 * Enforces a 20-tag maximum with an amber warning (does not block submission).
 * Shows a warning when all entered tags sanitize to nothing.
 */

import { useId } from "react";
import { parseTags } from "@/lib/sanitize";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
}

const MAX_TAGS = 20;

export default function TagInput({ value, onChange }: TagInputProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  const { valid, skipped } = parseTags(value, MAX_TAGS);
  const rawCount = value.split(",").filter((t) => t.trim()).length;
  const overLimit = rawCount > MAX_TAGS;
  const allInvalid = value.trim().length > 0 && valid.length === 0;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-[#1a1a1a]">
        Tags
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="summer, winter, holidays, birthday…"
        aria-describedby={hintId}
        className={[
          "w-full rounded-md border px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#6e6d6a]",
          "focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent",
          allInvalid ? "border-brand-red" : "border-[#e4e4e7]",
        ].join(" ")}
      />
      <p id={hintId} className="text-xs text-[#6e6d6a]">
        Separate tags with commas. Max {MAX_TAGS} tags.
      </p>

      {overLimit && (
        <p role="status" className="text-xs text-amber-600">
          {MAX_TAGS}-tag maximum — extra tags will be ignored.
        </p>
      )}

      {skipped.length > 0 && (
        <p role="status" className="text-xs text-amber-600">
          Skipped (no valid characters): {skipped.join(", ")}
        </p>
      )}

      {allInvalid && (
        <p role="alert" className="text-xs text-brand-red">
          No valid tags to process — check your input.
        </p>
      )}

      {valid.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {valid.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-[#1a1a1a]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
