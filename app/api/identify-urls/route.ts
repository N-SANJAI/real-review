import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { product } = await req.json();
  console.log(`[identify-urls] Building source URLs for "${product}"`);

  // Order matters: with concurrency=2, agents [0,1] run together then [2,3].
  // This pairs reddit+youtube (different sites, no rate limits).
  const urls = [
    {
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(product + " review")}&type=link&sort=relevance`,
      source_type: "reddit",
      reason: "Reddit thread #1 — first relevant discussion",
    },
    {
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(product + " review")}`,
      source_type: "youtube",
      reason: "YouTube video #1 — comments from top result",
    },
    {
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(product + " review")}&type=link&sort=relevance`,
      source_type: "reddit_2",
      reason: "Reddit thread #2 — second discussion for less bias",
    },
    {
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(product + " review")}`,
      source_type: "youtube_2",
      reason: "YouTube video #2 — comments from second result for less bias",
    },
  ];

  urls.forEach((u, i) =>
    console.log(`[identify-urls]   [${i + 1}] ${u.source_type.padEnd(10)} ${u.url}`)
  );

  return NextResponse.json({ urls });
}
