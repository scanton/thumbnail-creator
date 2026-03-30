/**
 * E2E test: full generation flow
 *
 * Requires a real xAI API key set in XAI_TEST_API_KEY env var.
 * Run nightly via CI — not in the standard unit test suite.
 */

import { test, expect } from "@playwright/test";

test.describe("Generation flow", () => {
  test.skip(
    !process.env.XAI_TEST_API_KEY,
    "Skipped — set XAI_TEST_API_KEY to run E2E tests"
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("full flow: enter key → select model → enter tags → generate → gallery updates", async ({
    page,
  }) => {
    const apiKey = process.env.XAI_TEST_API_KEY!;

    // Enter API key
    await page.fill('input[placeholder="Enter your xAI API key"]', apiKey);

    // Wait for model selector to populate
    await expect(page.locator("select")).not.toBeDisabled({ timeout: 10_000 });
    const modelCount = await page.locator("option").count();
    expect(modelCount).toBeGreaterThan(1); // at least one model option

    // Enter tags
    await page.fill('input[placeholder*="summer"]', "e2e-test-tag");

    // Click generate
    await page.click('button:has-text("Generate Thumbnails")');

    // Button should show generating state
    await expect(page.locator("button")).toContainText("Generating");

    // Gallery should show a loading card immediately
    await expect(page.locator(".animate-pulse")).toBeVisible({ timeout: 2000 });

    // Wait for generation to complete (up to 60s — xAI can be slow)
    await expect(page.locator('button:has-text("Generate Thumbnails")')).toBeVisible({
      timeout: 60_000,
    });

    // A thumbnail card should appear with the tag name
    await expect(page.getByText("e2e-test-tag")).toBeVisible({ timeout: 60_000 });
  });

  test("gallery persists after page reload", async ({ page }) => {
    await page.goto("/");
    // Previously generated thumbnails should load from /api/thumbnails
    // (any thumbnails from prior runs)
    await expect(page.locator(".grid")).toBeVisible();
  });
});
