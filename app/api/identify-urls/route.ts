import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";

export async function POST(req: NextRequest) {
  const { product } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a research assistant that finds the best URLs for honest, unbiased user reviews of consumer products.
Return ONLY a JSON object with a "urls" array of exactly 6 objects.
Each object must have:
- url: string (full https URL)
- source_type: one of "reddit" | "trustpilot" | "forum" | "youtube" | "other"  
- reason: short string explaining why this source is useful

Prioritise:
1. Reddit threads (r/BuyItForLife, r/headphones, relevant subreddits)
2. Trustpilot or verified review platforms
3. Niche tech forums (e.g. Head-Fi for audio, AVSForum for AV)
4. YouTube video with most comments for that product
5. A consumer review aggregator (e.g. RTINGS, Wirecutter)

Avoid: sponsored content, brand websites, SEO farms.`,
      },
      {
        role: "user",
        content: `Find 6 review sources for: "${product}"`,
      },
    ],
  });

  const content = completion.choices[0].message.content || "{}";
  const parsed = JSON.parse(content);

  return NextResponse.json(parsed);
}
