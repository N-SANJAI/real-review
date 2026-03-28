import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { product } = await req.json();
  console.log(`[identify-urls] Building source URLs for "${product}"`);

  const urls = [
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(product + " review site:reddit.com")}`,
      source_type: "reddit",
      reason: "Google search for Reddit discussions about the product",
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(product + " review site:youtube.com")}`,
      source_type: "youtube",
      reason: "Google search for YouTube reviews and comments",
    },
  ];

  urls.forEach((u, i) =>
    console.log(`[identify-urls]   [${i + 1}] ${u.source_type.padEnd(10)} ${u.url}`)
  );

  return NextResponse.json({ urls });
}
