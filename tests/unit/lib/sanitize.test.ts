import { describe, it, expect } from "vitest";
import { sanitizeTag, parseTags } from "@/lib/sanitize";

describe("sanitizeTag", () => {
  it("lowercases and trims whitespace", () => {
    expect(sanitizeTag("  Summer  ")).toBe("summer");
  });

  it("replaces internal spaces with hyphens", () => {
    expect(sanitizeTag("Summer Fun")).toBe("summer-fun");
  });

  it("collapses multiple spaces", () => {
    expect(sanitizeTag("a  b   c")).toBe("a-b-c");
  });

  it("strips non-alphanumeric characters", () => {
    expect(sanitizeTag("hello!world")).toBe("helloworld");
    expect(sanitizeTag("price: $10")).toBe("price-10");
  });

  it("strips unicode characters", () => {
    // 'été' → only ASCII letters survive: 't' and 'e' from 'é' are stripped
    const result = sanitizeTag("été");
    expect(/^[a-z0-9-]*$/.test(result)).toBe(true);
  });

  it("strips leading and trailing hyphens", () => {
    expect(sanitizeTag("-hello-")).toBe("hello");
  });

  it("returns empty string for input with no valid characters", () => {
    expect(sanitizeTag("@#$%")).toBe("");
    expect(sanitizeTag("   ")).toBe("");
    expect(sanitizeTag("")).toBe("");
  });

  it("allows single-character tags", () => {
    expect(sanitizeTag("a")).toBe("a");
    expect(sanitizeTag("1")).toBe("1");
  });

  it("allows hyphens within the tag", () => {
    expect(sanitizeTag("mother-s-day")).toBe("mother-s-day");
  });
});

describe("parseTags", () => {
  it("splits on commas and sanitizes each tag", () => {
    const { valid } = parseTags("summer, winter, holidays");
    expect(valid).toEqual(["summer", "winter", "holidays"]);
  });

  it("skips empty entries between commas", () => {
    const { valid } = parseTags("summer, , winter");
    expect(valid).toEqual(["summer", "winter"]);
  });

  it("reports tags that sanitize to empty", () => {
    const { valid, skipped } = parseTags("summer, @#$%, winter");
    expect(valid).toEqual(["summer", "winter"]);
    expect(skipped).toContain("@#$%");
  });

  it("deduplicates sanitized tags", () => {
    const { valid } = parseTags("summer, Summer, SUMMER");
    expect(valid).toEqual(["summer"]);
  });

  it("enforces maxTags limit", () => {
    const input = Array.from({ length: 25 }, (_, i) => `tag${i}`).join(", ");
    const { valid } = parseTags(input, 20);
    expect(valid).toHaveLength(20);
  });

  it("returns empty arrays for empty input", () => {
    const { valid, skipped } = parseTags("");
    expect(valid).toEqual([]);
    expect(skipped).toEqual([]);
  });
});
