import { NextRequest } from "next/server";
import { runTinyfishAgent, cancelAllActiveRuns } from "@/lib/tinyfish";
import { TargetUrl, ScrapedSource } from "@/lib/types";

export const maxDuration = 300;

function buildGoal(product: string, sourceType: string): string {
  const goals: Record<string, string> = {
    reddit: `You are on a Reddit search results page. Click on the most relevant discussion thread about "${product}" reviews. Once inside the thread, read through the comments and extract the key opinions, complaints, praise, and recurring issues. Return as JSON with fields: reviews (array of strings with actual user quotes/opinions), overall_sentiment (string).`,
    trustpilot: `Extract user reviews for "${product}" from this page. Get the review text, star ratings, and dates. Flag any suspicious patterns (many 5-star reviews from new accounts). Return as JSON with fields: reviews (array of strings), credibility_notes (string).`,
    forum: `Find all discussion posts and replies about "${product}". Extract user opinions, long-term ownership experiences, and any known issues. Return as JSON with fields: reviews (array of strings), credibility_notes (string).`,
    youtube: `Extract the top 20 comments from this YouTube video about "${product}". Focus on comments that share real user experiences. Return as JSON with fields: reviews (array of strings).`,
    other: `You are on a search results page. Click on the most relevant review article about "${product}". Once on the article page, extract the key opinions, pros, cons, verdict, and any scores or ratings mentioned. Return as JSON with fields: reviews (array of strings with direct quotes or opinions from the article), credibility_notes (string).`,
  };
  return goals[sourceType] || goals.other;
}

// Streams scrape progress as SSE so the client can show live browser views
export async function POST(req: NextRequest) {
  const { product, urls }: { product: string; urls: TargetUrl[] } = await req.json();

  // Cancel any zombie runs from previous sessions before starting fresh
  const cancelled = await cancelAllActiveRuns();
  if (cancelled > 0) {
    console.log(`[scrape] Cleared ${cancelled} zombie runs from queue`);
    // Brief pause to let TinyFish process the cancellations
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[scrape] Starting ${urls.length} agents for "${product}"`);
  urls.forEach((u, i) => console.log(`[scrape]   [${i + 1}] ${u.source_type.padEnd(10)} ${u.url}`));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const t0 = Date.now();
      const sources: (ScrapedSource | null)[] = new Array(urls.length).fill(null);
      const concurrency = 1;
      const queue = urls.map((u, i) => ({ u, i }));

      async function worker() {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          const { u, i } = item;

          send({ type: "agent_started", index: i, url: u.url, source_type: u.source_type });

          try {
            const data = await runTinyfishAgent(
              u.url,
              buildGoal(product, u.source_type),
              (event) => {
                if (event.type === "STREAMING_URL") {
                  // Try the most likely field names for the URL
                  const streamingUrl =
                    (event.url as string) ||
                    (event.streaming_url as string) ||
                    (event.stream_url as string) ||
                    (event.browser_url as string);
                  if (streamingUrl) {
                    send({ type: "agent_streaming", index: i, streaming_url: streamingUrl });
                  }
                  // Also forward the raw event in case field name is unexpected
                  send({ type: "agent_streaming_raw", index: i, raw: event });
                }
                if (event.type === "PROGRESS") {
                  send({
                    type: "agent_progress",
                    index: i,
                    message: String(event.message ?? event.description ?? ""),
                  });
                }
              }
            );

            const extracted = (data.result as Record<string, unknown>) || {};
            const rawReviews: unknown[] = (extracted.reviews as unknown[]) || [];
            const reviews = rawReviews.map((r) =>
              typeof r === "string" ? r : (r as Record<string, string>).text ?? JSON.stringify(r)
            );
            const source: ScrapedSource = {
              url: u.url,
              source_type: u.source_type,
              reviews,
              credibility_notes: (extracted.credibility_notes as string) || "",
              raw_result: data,
            };
            sources[i] = source;
            console.log(`[scrape] ✓ ${u.url} → ${source.reviews.length} reviews`);
            send({ type: "agent_done", index: i, source });
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            console.error(`[scrape] ✗ ${u.url} → ${reason}`);
            const source: ScrapedSource = {
              url: u.url,
              source_type: u.source_type,
              reviews: [],
              credibility_notes: "Failed to scrape this source.",
              raw_result: null,
            };
            sources[i] = source;
            send({ type: "agent_done", index: i, source, error: reason });
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, worker));
      console.log(`[scrape] All agents finished in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      send({ type: "done", sources: sources.filter(Boolean) });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
