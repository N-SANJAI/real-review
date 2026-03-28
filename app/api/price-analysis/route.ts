import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";
import { PriceEntry, PriceAnalysis, ReviewReport } from "@/lib/types";

function sanitize(s: string): string {
  return s.replace(/[\u0000-\u001f]/g, " ").slice(0, 500);
}

export async function POST(req: NextRequest) {
  const {
    product,
    prices,
    report,
  }: { product: string; prices: PriceEntry[]; report: ReviewReport } =
    await req.json();

  const available = prices.filter((p) => p.price !== null);
  const best =
    available.length > 0
      ? available.reduce((a, b) => (a.price! < b.price! ? a : b))
      : null;

  const priceLines = prices
    .map(
      (p) =>
        `${p.store}: ${p.price !== null ? `SGD $${p.price} - ${sanitize(p.product_name)}` : "Not available"}`
    )
    .join("; ");

  const userMsg = [
    `Product: ${sanitize(product)}`,
    `Score: ${report.score}/100`,
    `Verdict: ${sanitize(report.verdict)}`,
    `Pros: ${report.pros.map(sanitize).join("; ")}`,
    `Cons: ${report.cons.map(sanitize).join("; ")}`,
    `Prices: ${priceLines}`,
    `Best: ${best ? `SGD $${best.price} at ${best.store}` : "None available"}`,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Price analyst for Singapore shoppers. Given review data and prices, decide if worth buying. Return JSON: {"worth_it": true/false, "verdict": "1-2 sentences", "recommended_price": "SGD $X or null"}',
        },
        { role: "user", content: userMsg },
      ],
    });

    const json = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const analysis: PriceAnalysis = {
      best_price: best,
      all_prices: prices,
      worth_it: Boolean(json.worth_it),
      verdict: json.verdict ?? "Unable to determine.",
      recommended_price: json.recommended_price ?? null,
    };
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error("[price-analysis] OpenAI error:", e);
    const analysis: PriceAnalysis = {
      best_price: best,
      all_prices: prices,
      worth_it: available.length > 0,
      verdict: best
        ? `Best price found: SGD $${best.price} at ${best.store}.`
        : "No prices available to compare.",
      recommended_price: null,
    };
    return NextResponse.json({ analysis });
  }
}
