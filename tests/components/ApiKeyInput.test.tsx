import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApiKeyInput from "@/components/ApiKeyInput";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("ApiKeyInput", () => {
  beforeEach(() => localStorageMock.clear());

  it("renders with placeholder text", () => {
    render(<ApiKeyInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText("Enter your xAI API key")).toBeTruthy();
  });

  it("masks the input by default (type=password)", () => {
    render(<ApiKeyInput value="my-key" onChange={() => {}} />);
    // Password inputs don't have the "textbox" ARIA role — query by display value
    const input = screen.getByDisplayValue("my-key") as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("toggles visibility on eye button click", async () => {
    const user = userEvent.setup();
    render(<ApiKeyInput value="my-key" onChange={() => {}} />);
    const toggle = screen.getByRole("button", { name: /show api key/i });
    const input = screen.getByDisplayValue("my-key") as HTMLInputElement;
    expect(input.type).toBe("password");
    await user.click(toggle);
    expect(input.type).toBe("text");
  });

  it("persists key to localStorage on change", async () => {
    const user = userEvent.setup();
    const onChange = (key: string) => {
      localStorageMock.setItem("xai_api_key", key);
    };
    render(<ApiKeyInput value="" onChange={onChange} />);
    const input = screen.getByDisplayValue("");
    await user.type(input, "xk-test");
    expect(localStorageMock.getItem("xai_api_key")).toBeTruthy();
  });

  it("shows error message when error prop is set", () => {
    render(
      <ApiKeyInput
        value="bad-key"
        onChange={() => {}}
        error="Invalid API key — check your xAI dashboard"
      />
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Invalid API key/)).toBeTruthy();
  });

  it("shows the console.x.ai helper link", () => {
    render(<ApiKeyInput value="" onChange={() => {}} />);
    const link = screen.getByRole("link", { name: /console\.x\.ai/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://console.x.ai");
  });
});
