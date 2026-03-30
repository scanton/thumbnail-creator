import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThumbnailGallery from "@/components/ThumbnailGallery";
import type { ThumbnailResult } from "@/components/ThumbnailGallery";

describe("ThumbnailGallery", () => {
  it("shows empty state when results array is empty", () => {
    render(<ThumbnailGallery results={[]} />);
    expect(screen.getByText("No thumbnails yet")).toBeTruthy();
  });

  it("shows skeleton loading state during initial load", () => {
    render(<ThumbnailGallery results={[]} isInitialLoading={true} />);
    // Skeleton divs have animate-pulse class
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders loading card for status=loading", () => {
    const results: ThumbnailResult[] = [{ tag: "summer", status: "loading" }];
    render(<ThumbnailGallery results={results} />);
    expect(screen.getByText("summer")).toBeTruthy();
  });

  it("renders error card with role=alert for status=error", () => {
    const results: ThumbnailResult[] = [
      {
        tag: "summer",
        status: "error",
        errorCode: "INVALID_API_KEY",
      },
    ];
    render(<ThumbnailGallery results={results} />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(screen.getByText(/Invalid API key/)).toBeTruthy();
  });

  it("maps RATE_LIMITED error code to human-readable text", () => {
    const results: ThumbnailResult[] = [
      { tag: "summer", status: "error", errorCode: "RATE_LIMITED" },
    ];
    render(<ThumbnailGallery results={results} />);
    expect(screen.getByText(/Rate limited by xAI/)).toBeTruthy();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const results: ThumbnailResult[] = [
      { tag: "summer", status: "error", errorCode: "XAI_TIMEOUT" },
    ];
    render(<ThumbnailGallery results={results} onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledWith("summer");
  });

  it("shows 'Expires soon' badge for temp status", () => {
    const results: ThumbnailResult[] = [
      {
        tag: "summer",
        status: "temp",
        tempUrl: "https://images.x.ai/temp.png",
      },
    ];
    render(<ThumbnailGallery results={results} />);
    expect(screen.getByText("Expires soon")).toBeTruthy();
  });

  it("shows download link for success status", () => {
    const results: ThumbnailResult[] = [
      {
        tag: "summer",
        status: "success",
        url: "https://abc.public.blob.vercel-storage.com/thumbnail_summer.png",
      },
    ];
    render(<ThumbnailGallery results={results} />);
    const downloadLink = screen.getByRole("link", { name: /download summer/i });
    expect(downloadLink).toBeTruthy();
    expect(downloadLink.getAttribute("download")).toBe("thumbnail_summer.png");
  });
});
