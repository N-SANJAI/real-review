import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { product } = await req.json();
  console.log(`[identify-urls] Building source URLs for "${product}"`);

  const vergeSearch = `https://www.theverge.com/search?q=${encodeURIComponent(product)}+review`;

  const urls = [
    {
      url: vergeSearch,
      source_type: "other",
      reason: "The Verge search results for product reviews",
    },
  ];

  console.log(`[identify-urls]   [1] other      ${vergeSearch}`);

  return NextResponse.json({ urls });
}
