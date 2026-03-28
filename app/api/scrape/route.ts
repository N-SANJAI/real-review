import { NextRequest } from "next/server";
import { cancelAllActiveRuns, runTinyfishAgent } from "@/lib/tinyfish";
import { ReviewEntry, ScrapedSource, TargetUrl } from "@/lib/types";

export const maxDuration = 300;

function buildGoal(product: string, sourceType: string): string {
  const goals: Record<string, string> = {
    reddit: [
      `You are on Reddit search results for "${product} review".`,
      `Step 1: Click the first post that is a discussion about "${product}" (not an ad or unrelated post).`,
      `Step 2: On the thread page, read the post title, body text, and comment replies.`,
      `Step 3: Extract up to 20 distinct user opinions about "${product}" from the comments. Each opinion should be a real user's experience or view - skip bot replies, deleted comments, and off-topic replies.`,
      `Step 4: If a cookie/consent banner appears, dismiss it first.`,
      `Edge case: If search results are empty or no relevant thread exists, return immediately: { "reviews": [] }`,
      `Return JSON: { "reviews": ["opinion 1", "opinion 2", ...] }`,
    ].join(" "),

    youtube: [
      `You are on YouTube search results for "${product} review".`,
      `Step 1: Click the FIRST video result thumbnail or title (not an ad - skip any result marked "Ad").`,
      `Step 2: Wait for the video page to load. Scroll down past the video player to the comments section.`,
      `Step 3: Read the visible comments and extract up to 10 user comments that share opinions about "${product}".`,
      `Edge case: If comments are turned off or none are visible, return: { "reviews": [] }`,
      `Return JSON: { "reviews": ["comment 1", "comment 2", ...] }`,
    ].join(" "),

    trustpilot: [
      `You are on Trustpilot search results for "${product}".`,
      `Step 1: Look at the search results. If NONE of the results are specifically about "${product}" (e.g. they are about the brand generally, a parent company, or a different product), stop and return immediately: { "reviews": [] }`,
      `Step 2: If a relevant result exists, click it to go to the review page.`,
      `Step 3: Extract up to 10 reviews with their star ratings (1-5).`,
      `Return JSON: { "reviews": [{"text": "review text", "rating": 3}, ...] }`,
    ].join(" "),

    twitter: [
      `You are on DuckDuckGo search results for Twitter/X posts about "${product}".`,
      `Step 1: Look for links to twitter.com or x.com in the results. Click the first one.`,
      `Step 2: On the Twitter/X page, read the tweet and any visible replies.`,
      `Step 3: Extract up to 10 real user opinions or experiences about "${product}". Skip ads, promotional tweets, and bot replies.`,
      `Edge case: If Twitter requires login or shows an error page, return: { "reviews": [] }`,
      `Return JSON: { "reviews": ["tweet opinion 1", "tweet opinion 2", ...] }`,
    ].join(" "),

    other: `Find and click the most relevant review of "${product}". Extract key opinions. Return JSON: { "reviews": ["opinion 1", "opinion 2", ...] }`,
  };
  return goals[sourceType] || goals.other;
}

export async function POST(req: NextRequest) {
  const {
    product,
    urls,
    clearQueue = true,
  }: { product: string; urls: TargetUrl[]; clearQueue?: boolean } = await req.json();

  if (clearQueue) {
    const cancelled = await cancelAllActiveRuns();
    if (cancelled > 0) {
      console.log(`[scrape] Cleared ${cancelled} zombie runs from queue`);
      await new Promise((r) => setTimeout(r, 1500));
    }
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
      const concurrency = 4;
      const queue = urls.map((u, i) => ({ u, i }));

      async function worker() {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          const { u, i } = item;

          send({ type: "agent_started", index: i, url: u.url, source_type: u.source_type });

          try {
            const data = await runTinyfishAgent(u.url, buildGoal(product, u.source_type), (event) => {
              if (event.type === "STREAMING_URL") {
                const streamingUrl =
                  (event.url as string) ||
                  (event.streaming_url as string) ||
                  (event.stream_url as string) ||
                  (event.browser_url as string);
                if (streamingUrl) {
                  send({ type: "agent_streaming", index: i, streaming_url: streamingUrl });
                }
                send({ type: "agent_streaming_raw", index: i, raw: event });
              }
              if (event.type === "PROGRESS") {
                send({
                  type: "agent_progress",
                  index: i,
                  message: String(event.message ?? event.description ?? ""),
                });
              }
            });

            const extracted = (data.result as Record<string, unknown>) || {};
            const rawReviews: unknown[] = (extracted.reviews as unknown[]) || [];
            const reviews: ReviewEntry[] = rawReviews
              .map((review): ReviewEntry | null => {
                if (typeof review === "string") {
                  return { text: review };
                }
                if (!review || typeof review !== "object") {
                  return null;
                }

                const item = review as Record<string, unknown>;
                const text =
                  typeof item.text === "string"
                    ? item.text
                    : typeof item.comment === "string"
                      ? item.comment
                      : typeof item.review === "string"
                        ? item.review
                        : JSON.stringify(item);

                const ratingValue = item.rating ?? item.stars ?? item.score;
                const rating = typeof ratingValue === "number" ? ratingValue : null;
                const date =
                  typeof item.date === "string"
                    ? item.date
                    : typeof item.created_at === "string"
                      ? item.created_at
                      : typeof item.timestamp === "string"
                        ? item.timestamp
                        : null;

                return { text, rating, date };
              })
              .filter((review): review is ReviewEntry => Boolean(review?.text));

            const source: ScrapedSource = {
              url: u.url,
              source_type: u.source_type,
              reviews,
              credibility_notes: (extracted.credibility_notes as string) || "",
              raw_result: data,
            };
            sources[i] = source;
            console.log(`[scrape] OK ${u.url} -> ${source.reviews.length} reviews`);
            send({ type: "agent_done", index: i, source });
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            console.error(`[scrape] FAIL ${u.url} -> ${reason}`);
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
      Connection: "keep-alive",
    },
  });
}
