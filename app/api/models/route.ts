/**
 * GET /api/models
 *
 * Proxies the xAI image model listing to the client.
 * The user's API key is sent in the x-api-key header and used only for this call.
 *
 * Why proxy this instead of calling xAI from the browser?
 * Consistency: all xAI traffic goes through server-side routes. The client never
 * has direct access to xAI endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import { createXaiClient, XaiApiError } from "@/lib/xai";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing x-api-key header", code: "MISSING_API_KEY" },
      { status: 400 }
    );
  }

  const xai = createXaiClient(apiKey);

  try {
    const models = await xai.listModels();
    return NextResponse.json({ models });
  } catch (error) {
    if (error instanceof XaiApiError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key", code: "INVALID_API_KEY" },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limited by xAI", code: "RATE_LIMITED" },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `xAI API error: ${error.status}`, code: "XAI_ERROR" },
        { status: 502 }
      );
    }
    console.error("[/api/models] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
