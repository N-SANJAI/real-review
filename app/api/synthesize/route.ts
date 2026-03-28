import { NextRequest, NextResponse } from "next/server";
import { ScrapedSource, ReviewReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { product, sources }: { product: string; sources: ScrapedSource[] } =
    await req.json();

  // Collect all reviews across sources
  const allReviews = sources
    .flatMap((s) => s.reviews)
    .map((review) => review.text)
    .filter(Boolean);

  // Simple keyword-based sentiment analysis (no AI needed)
  const positiveWords = [
    "love", "great", "amazing", "excellent", "best", "awesome", "perfect",
    "fantastic", "solid", "recommend", "worth", "comfortable", "good",
    "impressive", "premium", "quality",
  ];
  const negativeWords = [
    "bad", "worst", "terrible", "hate", "broke", "broken", "cheap",
    "disappointing", "issue", "problem", "return", "refund", "waste",
    "overpriced", "uncomfortable", "flimsy", "defect",
  ];

  const pros: string[] = [];
  const cons: string[] = [];

  for (const review of allReviews) {
    const lower = review.toLowerCase();
    const isPositive = positiveWords.some((w) => lower.includes(w));
    const isNegative = negativeWords.some((w) => lower.includes(w));

    if (isPositive && !isNegative && pros.length < 6) {
      pros.push(review.length > 150 ? review.slice(0, 147) + "..." : review);
    } else if (isNegative && cons.length < 6) {
      cons.push(review.length > 150 ? review.slice(0, 147) + "..." : review);
    }
  }

  // Count sentiment to compute a rough score
  let positiveCount = 0;
  let negativeCount = 0;
  for (const review of allReviews) {
    const lower = review.toLowerCase();
    if (positiveWords.some((w) => lower.includes(w))) positiveCount++;
    if (negativeWords.some((w) => lower.includes(w))) negativeCount++;
  }
  const total = positiveCount + negativeCount || 1;
  const score = Math.round((positiveCount / total) * 8 + 2); // Scale 2-10

  const sourceList = sources.map((s) => s.source_type).join(", ");

  const report: ReviewReport = {
    verdict:
      allReviews.length === 0
        ? `Not enough reviews found for ${product}.`
        : score >= 7
          ? `${product} is well-regarded by real users.`
          : score >= 5
            ? `${product} gets mixed reactions from real users.`
            : `${product} has significant complaints from real users.`,
    score: Math.min(10, Math.max(1, score)),
    pros: pros.length > 0 ? pros : ["No clear positives extracted yet."],
    cons: cons.length > 0 ? cons : ["No clear negatives extracted yet."],
    red_flags: [],
    summary: `Based on ${allReviews.length} real user opinions from ${sourceList}. This is a simple aggregation — no AI synthesis applied.`,
  };

  return NextResponse.json({ report });
}
