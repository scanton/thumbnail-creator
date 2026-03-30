/**
 * Tag sanitization — converts user-entered tag names into safe filenames.
 *
 * The sanitized value is used as the filename stem: thumbnail_{sanitized}.png
 * It is also sent to xAI as the subject of the image generation prompt.
 */

/**
 * Converts a raw tag string into a safe, lowercase, hyphenated filename stem.
 *
 * Rules applied in order:
 *   1. Trim leading/trailing whitespace
 *   2. Lowercase
 *   3. Replace internal whitespace runs with a single hyphen
 *   4. Strip any character that is not a-z, 0-9, or hyphen (removes unicode, punctuation)
 *   5. Strip leading and trailing hyphens
 *
 * Returns an empty string if nothing survives sanitization (e.g. input was "@#$%").
 * Callers should skip empty results and log a warning with the original value.
 *
 * Examples:
 *   "Summer Fun"  → "summer-fun"
 *   "  holidays " → "holidays"
 *   "été"         → "t"  (unicode stripped, only ASCII 't' survives)
 *   "@#$%"        → ""   (caller should skip)
 *   "a"           → "a"  (single-char is valid)
 */
export function sanitizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parses a comma-delimited tag string into an array of sanitized tags.
 * Empty and duplicate sanitized tags are removed.
 * Returns at most maxTags results (default 20).
 */
export function parseTags(
  raw: string,
  maxTags = 20
): { valid: string[]; skipped: string[] } {
  const parts = raw.split(",");
  const valid: string[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const sanitized = sanitizeTag(part);
    if (!sanitized) {
      if (part.trim()) skipped.push(part.trim()); // non-empty input that sanitized to nothing
      continue;
    }
    if (seen.has(sanitized)) continue; // deduplicate
    seen.add(sanitized);
    if (valid.length < maxTags) {
      valid.push(sanitized);
    }
  }

  return { valid, skipped };
}
