/**
 * E2E test: localStorage persistence and gallery reload
 */

import { test, expect } from "@playwright/test";

test.describe("Persistence", () => {
  test("API key is restored from localStorage on page reload", async ({ page }) => {
    await page.goto("/");

    // Set key via localStorage directly (faster than typing)
    await page.evaluate(() => {
      localStorage.setItem("xai_api_key", "test-persisted-key");
    });
    await page.reload();

    // The API key input should be pre-filled
    const input = page.locator('input[placeholder="Enter your xAI API key"]');
    // Value is masked but should not be empty
    const value = await input.inputValue();
    expect(value).toBe("test-persisted-key");
  });

  test("clearing API key removes it from localStorage", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("xai_api_key", "some-key");
    });
    await page.reload();

    // Clear the input
    const input = page.locator('input[placeholder="Enter your xAI API key"]');
    await input.fill("");

    const stored = await page.evaluate(() =>
      localStorage.getItem("xai_api_key")
    );
    expect(stored).toBeNull();
  });
});
