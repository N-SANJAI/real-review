import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";
import { ScrapedSource } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { product, sources }: { product: string; sources: ScrapedSource[] } = await req.json();

  // Flatten all reviews into a readable block
  const reviewsBlock = sources
    .map((s) => {
      const reviews = s.reviews.slice(0, 10).join("\n- ");
      return `## ${s.source_type.toUpperCase()} (${s.url})\nCredibility: ${s.credibility_notes || "N/A"}\nReviews:\n- ${reviews}`;
    })
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert product analyst. You synthesize real user reviews from multiple sources into an honest, balanced report.
Return ONLY a JSON object with these fields:
- verdict: string (1 punchy sentence summarising the product)
- score: number (1-10, based on user sentiment — not your own opinion)
- pros: string[] (4-6 items, from real user feedback)
- cons: string[] (4-6 items, from real user feedback)
- red_flags: string[] (0-3 items, serious issues mentioned multiple times e.g. "breaks after 6 months")
- summary: string (2-3 sentences of balanced analysis)

Base everything strictly on what users said. Do not invent or embellish.`,
      },
      {
        role: "user",
        content: `Synthesize a review report for: "${product}"\n\nUser review data:\n\n${reviewsBlock}`,
      },
    ],
  });

  const content = completion.choices[0].message.content || "{}";
  const report = JSON.parse(content);

  return NextResponse.json({ report });
}
