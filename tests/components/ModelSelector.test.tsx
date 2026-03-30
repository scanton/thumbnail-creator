import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ModelSelector from "@/components/ModelSelector";

describe("ModelSelector", () => {
  it("shows 'Enter API key first' when no API key", () => {
    render(<ModelSelector apiKey="" value="" onChange={() => {}} />);
    expect(screen.getByText("Enter API key first")).toBeTruthy();
  });

  it("shows loading state while fetching", async () => {
    render(<ModelSelector apiKey="valid-test-key" value="" onChange={() => {}} />);
    expect(screen.getByText("Loading models…")).toBeTruthy();
  });

  it("populates models after successful fetch", async () => {
    render(<ModelSelector apiKey="valid-test-key" value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /aurora/i })).toBeTruthy();
    });
  });

  it("shows error state for invalid key", async () => {
    render(<ModelSelector apiKey="bad-key" value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/Could not load models/i)).toBeTruthy();
    });
  });

  it("select is disabled before API key is entered", () => {
    render(<ModelSelector apiKey="" value="" onChange={() => {}} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });
});
