import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";
import { ScrapedSource, ReviewReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { product, sources }: { product: string; sources: ScrapedSource[] } =
    await req.json();

  const allReviews = sources
    .flatMap((s) => s.reviews)
    .map((review) => review.text)
    .filter(Boolean);

  if (allReviews.length === 0) {
    const report: ReviewReport = {
      verdict: `Not enough reviews found for ${product}.`,
      score: 0,
      pros: ["No data collected yet."],
      cons: ["No data collected yet."],
      red_flags: [],
      summary: "No reviews were scraped from any source.",
    };
    return NextResponse.json({ report });
  }

  const sourceBreakdown = sources
    .map((s) => `${s.source_type} (${s.reviews.length} reviews)`)
    .join(", ");

  const reviewBlock = sources
    .map(
      (s) =>
        `--- ${s.source_type.toUpperCase()} ---\n${s.reviews.map((r, i) => `${i + 1}. ${r.text}${r.rating != null ? ` [${r.rating}/5]` : ""}${r.date ? ` (${r.date})` : ""}`).join("\n")}`
    )
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a product review analyst. Analyze real user reviews and produce an honest, balanced verdict. Return valid JSON matching this exact schema:
{
  "verdict": "1-2 sentence overall verdict",
  "score": <number 1-100>,
  "pros": ["up to 6 key positives"],
  "cons": ["up to 6 key negatives"],
  "red_flags": ["any serious concerns like safety issues, fake reviews, or scams — empty array if none"],
  "summary": "2-3 sentence summary of the overall sentiment and what sources were used"
}

Be specific — cite actual patterns from the reviews, not generic statements. If reviews are mostly positive, reflect that. If mostly negative, reflect that. Be honest.`,
      },
      {
        role: "user",
        content: `Analyze these ${allReviews.length} real user reviews for "${product}" from ${sourceBreakdown}:\n\n${reviewBlock}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let parsed: ReviewReport;
  try {
    const json = JSON.parse(raw);
    parsed = {
      verdict: json.verdict ?? `Review analysis for ${product}.`,
      score: Math.min(100, Math.max(1, Number(json.score) || 50)),
      pros: Array.isArray(json.pros) ? json.pros.slice(0, 6) : [],
      cons: Array.isArray(json.cons) ? json.cons.slice(0, 6) : [],
      red_flags: Array.isArray(json.red_flags) ? json.red_flags : [],
      summary: json.summary ?? `Based on ${allReviews.length} reviews from ${sourceBreakdown}.`,
    };
  } catch {
    parsed = {
      verdict: `Could not parse AI analysis for ${product}.`,
      score: 50,
      pros: [],
      cons: [],
      red_flags: [],
      summary: raw.slice(0, 500),
    };
  }

  return NextResponse.json({ report: parsed });
}
