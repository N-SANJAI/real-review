import { NextRequest, NextResponse } from "next/server";
import { runParallelAgents } from "@/lib/tinyfish";
import { TargetUrl, ScrapedSource } from "@/lib/types";

function buildGoal(product: string, sourceType: string): string {
  const goals: Record<string, string> = {
    reddit: `Find all user comments and reviews about "${product}". Extract the key opinions, complaints, praise, and any recurring issues mentioned. Return as JSON with fields: reviews (array of strings), overall_sentiment (string).`,
    trustpilot: `Extract user reviews for "${product}" from this page. Get the review text, star ratings, and dates. Flag any suspicious patterns (many 5-star reviews from new accounts). Return as JSON with fields: reviews (array of strings), credibility_notes (string).`,
    forum: `Find all discussion posts and replies about "${product}". Extract user opinions, long-term ownership experiences, and any known issues. Return as JSON with fields: reviews (array of strings), credibility_notes (string).`,
    youtube: `Extract the top 20 comments from this YouTube video about "${product}". Focus on comments that share real user experiences. Return as JSON with fields: reviews (array of strings).`,
    other: `Find and extract user reviews, ratings, and opinions about "${product}" from this page. Return as JSON with fields: reviews (array of strings), credibility_notes (string).`,
  };
  return goals[sourceType] || goals.other;
}

export async function POST(req: NextRequest) {
  const { product, urls }: { product: string; urls: TargetUrl[] } = await req.json();

  const tasks = urls.map((u) => ({
    url: u.url,
    goal: buildGoal(product, u.source_type),
  }));

  const results = await runParallelAgents(tasks);

  const sources: ScrapedSource[] = results.map((result, i) => {
    const url = urls[i];
    if (result.status === "fulfilled") {
      const data = result.value;
      const extracted = data.result || {};
      return {
        url: url.url,
        source_type: url.source_type,
        reviews: extracted.reviews || [],
        credibility_notes: extracted.credibility_notes || "",
        raw_result: data,
      };
    } else {
      return {
        url: url.url,
        source_type: url.source_type,
        reviews: [],
        credibility_notes: "Failed to scrape this source.",
        raw_result: null,
      };
    }
  });

  return NextResponse.json({ sources });
}
