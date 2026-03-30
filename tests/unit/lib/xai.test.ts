import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createXaiClient, XaiApiError } from "@/lib/xai";
import { server } from "@/tests/msw/server";
import { http, HttpResponse } from "msw";

const VALID_KEY = "valid-test-key";

// 1×1 transparent PNG as Uint8Array (for mocked image responses)
const FAKE_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe("createXaiClient", () => {
  describe("listModels", () => {
    // listModels does NOT use AbortController — MSW handlers work fine here.

    it("returns models for a valid key", async () => {
      const client = createXaiClient(VALID_KEY);
      const models = await client.listModels();
      expect(models).toHaveLength(2);
      expect(models[0]).toMatchObject({ id: "aurora" });
    });

    it("throws XaiApiError with status 401 for invalid key", async () => {
      const client = createXaiClient("bad-key");
      await expect(client.listModels()).rejects.toBeInstanceOf(XaiApiError);
    });

    it("throws XaiApiError for 429 rate limiting", async () => {
      server.use(
        http.get("https://api.x.ai/v1/image-generation-models", () =>
          HttpResponse.json({ error: "Too Many Requests" }, { status: 429 })
        )
      );
      const client = createXaiClient(VALID_KEY);
      await expect(client.listModels()).rejects.toMatchObject({ status: 429 });
    });
  });

  describe("generateImage", () => {
    // generateImage uses AbortController + signal which conflicts with MSW interceptors
    // in the Bun/jsdom test environment. We mock fetch directly here.

    let originalFetch: typeof global.fetch;
    beforeEach(() => {
      originalFetch = global.fetch;
    });
    afterEach(() => {
      global.fetch = originalFetch;
    });

    function mockFetch(response: Response) {
      global.fetch = vi.fn().mockResolvedValue(response);
    }

    it("returns a URL result for successful generation", async () => {
      mockFetch(
        new Response(
          JSON.stringify({ data: [{ url: "https://images.x.ai/test.png" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
      const client = createXaiClient(VALID_KEY);
      const result = await client.generateImage("aurora", "test prompt");
      expect(result.type).toBe("url");
      if (result.type === "url") {
        expect(result.url).toBe("https://images.x.ai/test.png");
      }
    });

    it("throws XaiApiError for 401", async () => {
      mockFetch(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );
      const client = createXaiClient("bad-key");
      await expect(
        client.generateImage("aurora", "test")
      ).rejects.toBeInstanceOf(XaiApiError);
    });

    it("throws XaiApiError for 429", async () => {
      mockFetch(
        new Response(JSON.stringify({ error: "Too Many Requests" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })
      );
      const client = createXaiClient(VALID_KEY);
      await expect(
        client.generateImage("aurora", "test")
      ).rejects.toMatchObject({ status: 429 });
    });

    it("handles b64_json response format", async () => {
      const b64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=";
      mockFetch(
        new Response(
          JSON.stringify({ data: [{ b64_json: b64 }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
      const client = createXaiClient(VALID_KEY);
      const result = await client.generateImage("aurora", "test");
      expect(result.type).toBe("b64");
      if (result.type === "b64") {
        expect(result.data).toBeInstanceOf(Buffer);
      }
    });

    it("throws on SSRF attempt — non-.x.ai hostname", async () => {
      mockFetch(
        new Response(
          JSON.stringify({
            data: [{ url: "https://evil.example.com/exfil.png" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
      const client = createXaiClient(VALID_KEY);
      await expect(
        client.generateImage("aurora", "test")
      ).rejects.toThrow("SSRF guard");
    });
  });
});
