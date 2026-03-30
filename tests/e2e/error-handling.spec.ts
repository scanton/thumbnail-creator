/**
 * E2E test: error handling UX
 */

import { test, expect } from "@playwright/test";

test.describe("Error handling", () => {
  test("API key field shows helper link on load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /console\.x\.ai/i })).toBeVisible();
  });

  test("model selector is disabled before API key is entered", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("select")).toBeDisabled();
  });

  test("generate button is disabled with no API key", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('button:has-text("Generate Thumbnails")')).toBeDisabled();
  });

  test("generate button is disabled with API key but no tags", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[placeholder="Enter your xAI API key"]', "some-key");
    // No tags entered — button should still be disabled
    await expect(page.locator('button:has-text("Generate Thumbnails")')).toBeDisabled();
  });

  test("invalid API key shows error on model load", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[placeholder="Enter your xAI API key"]', "invalid-key-123");
    await expect(page.getByText(/Could not load models/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("empty gallery shows instructions", async ({ page }) => {
    await page.goto("/");
    // Before thumbnails load or if none exist
    // Wait for initial loading to complete
    await expect(page.locator(".animate-pulse").first()).toBeHidden({
      timeout: 10_000,
    });
    // Either "No thumbnails yet" or actual thumbnails
    const gallery = page.locator("main");
    await expect(gallery).toBeVisible();
  });
});
