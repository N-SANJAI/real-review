import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";
import { ComparisonReport, PriceAnalysis, ReviewReport } from "@/lib/types";

function sanitize(value: string | null | undefined): string {
  return (value ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, 800);
}

function formatPriceSummary(priceAnalysis: PriceAnalysis | null) {
  if (!priceAnalysis) return "No pricing data available.";
  if (!priceAnalysis.best_price) return "Pricing checked, but no store had a confirmed match.";

  return [
    `Best price: SGD $${priceAnalysis.best_price.price} at ${priceAnalysis.best_price.store}`,
    `Worth it: ${priceAnalysis.worth_it ? "yes" : "not yet"}`,
    `Pricing verdict: ${sanitize(priceAnalysis.verdict)}`,
    `Recommended buy price: ${sanitize(priceAnalysis.recommended_price) || "none"}`,
  ].join(" | ");
}

export async function POST(req: NextRequest) {
  const {
    productA,
    reportA,
    pricingA,
    productB,
    reportB,
    pricingB,
  }: {
    productA: string;
    reportA: ReviewReport;
    pricingA: PriceAnalysis | null;
    productB: string;
    reportB: ReviewReport;
    pricingB: PriceAnalysis | null;
  } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You compare two product review reports for shoppers and return strict JSON matching:
{
  "winner_overall": "product_a" | "product_b" | "tie",
  "winner_value": "product_a" | "product_b" | "tie",
  "strengths_a": ["3 short strengths for product A"],
  "strengths_b": ["3 short strengths for product B"],
  "weaknesses_a": ["up to 3 weaknesses for product A"],
  "weaknesses_b": ["up to 3 weaknesses for product B"],
  "best_for_a": "1 sentence on who product A is best for",
  "best_for_b": "1 sentence on who product B is best for",
  "final_recommendation": "2 sentences telling a buyer how to choose",
  "summary": "2 sentences summarizing the tradeoff"
}

Base the decision on evidence quality, review sentiment, red flags, and value for money. If both are close, use "tie". Keep every list concise and concrete.`,
        },
        {
          role: "user",
          content: [
            `Product A: ${sanitize(productA)}`,
            `Score: ${reportA.score}/100`,
            `Verdict: ${sanitize(reportA.verdict)}`,
            `Summary: ${sanitize(reportA.summary)}`,
            `Pros: ${reportA.pros.map(sanitize).join("; ")}`,
            `Cons: ${reportA.cons.map(sanitize).join("; ")}`,
            `Red flags: ${reportA.red_flags.map(sanitize).join("; ") || "none"}`,
            `Pricing: ${formatPriceSummary(pricingA)}`,
            "",
            `Product B: ${sanitize(productB)}`,
            `Score: ${reportB.score}/100`,
            `Verdict: ${sanitize(reportB.verdict)}`,
            `Summary: ${sanitize(reportB.summary)}`,
            `Pros: ${reportB.pros.map(sanitize).join("; ")}`,
            `Cons: ${reportB.cons.map(sanitize).join("; ")}`,
            `Red flags: ${reportB.red_flags.map(sanitize).join("; ") || "none"}`,
            `Pricing: ${formatPriceSummary(pricingB)}`,
          ].join("\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<ComparisonReport>;

    const comparison: ComparisonReport = {
      winner_overall:
        parsed.winner_overall === "product_a" ||
        parsed.winner_overall === "product_b" ||
        parsed.winner_overall === "tie"
          ? parsed.winner_overall
          : "tie",
      winner_value:
        parsed.winner_value === "product_a" ||
        parsed.winner_value === "product_b" ||
        parsed.winner_value === "tie"
          ? parsed.winner_value
          : "tie",
      strengths_a: Array.isArray(parsed.strengths_a) ? parsed.strengths_a.slice(0, 4) : [],
      strengths_b: Array.isArray(parsed.strengths_b) ? parsed.strengths_b.slice(0, 4) : [],
      weaknesses_a: Array.isArray(parsed.weaknesses_a) ? parsed.weaknesses_a.slice(0, 4) : [],
      weaknesses_b: Array.isArray(parsed.weaknesses_b) ? parsed.weaknesses_b.slice(0, 4) : [],
      best_for_a: parsed.best_for_a ?? `${productA} suits buyers who prioritize its strongest positives.`,
      best_for_b: parsed.best_for_b ?? `${productB} suits buyers who prioritize its strongest positives.`,
      final_recommendation:
        parsed.final_recommendation ?? `Pick the one that best matches your priorities and budget.`,
      summary: parsed.summary ?? `Both products have different strengths, so the better choice depends on what matters most to you.`,
    };

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("[compare] Failed to synthesize comparison:", error);

    const comparison: ComparisonReport = {
      winner_overall:
        reportA.score === reportB.score
          ? "tie"
          : reportA.score > reportB.score
            ? "product_a"
            : "product_b",
      winner_value:
        pricingA?.worth_it === pricingB?.worth_it
          ? "tie"
          : pricingA?.worth_it
            ? "product_a"
            : pricingB?.worth_it
              ? "product_b"
              : "tie",
      strengths_a: reportA.pros.slice(0, 3),
      strengths_b: reportB.pros.slice(0, 3),
      weaknesses_a: reportA.cons.slice(0, 3),
      weaknesses_b: reportB.cons.slice(0, 3),
      best_for_a: `${productA} is a better fit if its strongest positives matter more to you than its tradeoffs.`,
      best_for_b: `${productB} is a better fit if its strongest positives matter more to you than its tradeoffs.`,
      final_recommendation: `Use the side-by-side reports to choose based on the tradeoffs that matter most to you.`,
      summary: `${productA} scored ${reportA.score}/100 and ${productB} scored ${reportB.score}/100.`,
    };

    return NextResponse.json({ comparison });
  }
}
