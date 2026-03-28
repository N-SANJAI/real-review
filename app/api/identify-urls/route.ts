import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { product } = await req.json();
  console.log(`[identify-urls] Building source URLs for "${product}"`);

  const urls = [
    {
      url: `https://duckduckgo.com/?q=${encodeURIComponent(product + " review site:reddit.com")}`,
      source_type: "reddit",
      reason: "DuckDuckGo search for Reddit discussions about the product",
    },
    {
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(product + " review")}`,
      source_type: "youtube",
      reason: "YouTube video #1 — comments from the first result",
    },
    {
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(product + " review")}`,
      source_type: "youtube_2",
      reason: "YouTube video #2 — comments from the second result for less bias",
    },
    {
      url: `https://www.amazon.com/s?k=${encodeURIComponent(product)}`,
      source_type: "amazon",
      reason: "Amazon search for customer reviews",
    },
    {
      url: `https://www.trustpilot.com/search?query=${encodeURIComponent(product)}`,
      source_type: "trustpilot",
      reason: "Trustpilot search for user reviews",
    },
  ];

  urls.forEach((u, i) =>
    console.log(`[identify-urls]   [${i + 1}] ${u.source_type.padEnd(10)} ${u.url}`)
  );

  return NextResponse.json({ urls });
}
