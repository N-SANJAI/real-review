import { NextRequest, NextResponse } from "next/server";

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;
const TINYFISH_BASE = "https://agent.tinyfish.ai/v1";

// GET /api/test-agent  — dumps raw SSE events from a single TinyFish run
// Optionally pass ?url=... to test a specific URL
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const url = searchParams.get("url") || "https://scrapeme.live/shop";

  if (!TINYFISH_API_KEY) {
    return NextResponse.json({ error: "TINYFISH_API_KEY is not set" }, { status: 500 });
  }

  const events: unknown[] = [];
  const rawLines: string[] = [];

  try {
    const response = await fetch(`${TINYFISH_BASE}/automation/run-sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": TINYFISH_API_KEY,
      },
      body: JSON.stringify({
        url,
        goal: 'Extract the page title and first 3 links. Return as JSON: { "title": string, "links": string[] }',
        browser_profile: "lite",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `HTTP ${response.status}`, body: text, api_key_prefix: TINYFISH_API_KEY.slice(0, 8) + "..." },
        { status: 502 }
      );
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        rawLines.push(line);
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          events.push(event);
          if (event.type === "COMPLETE") {
            return NextResponse.json({ success: true, events, rawLines, completeEvent: event });
          }
        } catch {
          // non-JSON data line
        }
      }
    }

    return NextResponse.json({ success: false, error: "Stream ended without COMPLETE", events, rawLines });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: String(e),
      api_key_set: !!TINYFISH_API_KEY,
      api_key_prefix: TINYFISH_API_KEY ? TINYFISH_API_KEY.slice(0, 8) + "..." : null,
    });
  }
}
