"use client";

/**
 * ApiKeyInput — API key entry with localStorage persistence.
 *
 * The key is stored in localStorage under "xai_api_key" and restored on mount.
 * It is never sent to our server except as a request header for xAI proxy calls.
 *
 * States: empty, filled (masked), filled (visible), error (401 from API)
 */

import { useState, useEffect, useId } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ApiKeyInputProps {
  value: string;
  onChange: (key: string) => void;
  error?: string; // e.g. "Invalid API key — check your xAI dashboard"
}

const LOCAL_STORAGE_KEY = "xai_api_key";

export default function ApiKeyInput({ value, onChange, error }: ApiKeyInputProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved && !value) {
      onChange(saved);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const key = e.target.value;
    onChange(key);
    if (key) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-[#1a1a1a]">
        API Key
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={handleChange}
          placeholder="Enter your xAI API key"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${helpId} ${error ? errorId : ""}`}
          className={[
            "w-full rounded-md border px-3 py-2 pr-10 text-sm text-[#1a1a1a] placeholder:text-[#6e6d6a]",
            "focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent",
            error ? "border-brand-red bg-brand-red-light" : "border-[#e4e4e7]",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide API key" : "Show API key"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6e6d6a] hover:text-[#1a1a1a]"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <p id={helpId} className="text-xs text-[#6e6d6a]">
        Get your key at{" "}
        <a
          href="https://console.x.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[#1a1a1a]"
        >
          console.x.ai
        </a>{" "}
        → API Keys
      </p>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-brand-red">
          {error}
        </p>
      )}
    </div>
  );
}
