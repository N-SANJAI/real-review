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
      url: `https://duckduckgo.com/?q=${encodeURIComponent(product + " review site:youtube.com")}`,
      source_type: "youtube",
      reason: "DuckDuckGo search for YouTube reviews and comments",
    },
    {
      url: `https://duckduckgo.com/?q=${encodeURIComponent(product + " review site:amazon.com")}`,
      source_type: "amazon",
      reason: "DuckDuckGo search for Amazon customer reviews",
    },
    {
      url: `https://duckduckgo.com/?q=${encodeURIComponent(product + " review site:trustpilot.com")}`,
      source_type: "trustpilot",
      reason: "DuckDuckGo search for Trustpilot reviews",
    },
  ];

  urls.forEach((u, i) =>
    console.log(`[identify-urls]   [${i + 1}] ${u.source_type.padEnd(10)} ${u.url}`)
  );

  return NextResponse.json({ urls });
}
