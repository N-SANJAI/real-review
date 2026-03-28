import { NextRequest, NextResponse } from "next/server";
import { runTinyfishAgent } from "@/lib/tinyfish";
import { PriceEntry } from "@/lib/types";

export const maxDuration = 300;

const STORES: { store: string; url: (q: string) => string; profile: "lite" | "stealth" }[] = [
  {
    store: "Amazon.sg",
    url: (q: string) => `https://www.amazon.sg/s?k=${encodeURIComponent(q)}`,
    profile: "lite",
  },
  {
    store: "Courts",
    url: (q: string) => `https://www.courts.com.sg/catalogsearch/result/?q=${encodeURIComponent(q)}`,
    profile: "lite",
  },
  {
    store: "Harvey Norman",
    url: (q: string) => `https://www.harveynorman.com.sg/search?q=${encodeURIComponent(q)}`,
    profile: "lite",
  },
];

function buildPriceGoal(product: string): string {
  return [
    `You are on a search results page for "${product}".`,
    `Step 1: Look at the product listings on this page. Find the listing that best matches "${product}" — it must be the actual product, not an accessory, case, cable, or unrelated item.`,
    `Step 2: Click on that product listing to navigate to its product detail page.`,
    `Step 3: On the product page, extract three things: (a) the exact product name as shown, (b) the selling price in SGD as displayed, (c) the full URL from the browser address bar.`,
    `Edge case: If no matching product exists in the results, or the page is empty/blocked, return immediately: { "product_name": "", "price": "", "product_url": "" }`,
    `Edge case: If a cookie/consent banner appears, dismiss it first before proceeding.`,
    `Return JSON: { "product_name": "Samsung Galaxy S24 Ultra 256GB", "price": "$1,498.00", "product_url": "https://example.com/product/123" }`,
  ].join(" ");
}

function parsePrice(raw: string): number | null {
  if (!raw) return null;
  // Strip currency symbols, commas, whitespace — extract first number
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

async function fetchStorePrice(
  store: { store: string; url: (q: string) => string; profile: "lite" | "stealth" },
  product: string
): Promise<PriceEntry> {
  const searchUrl = store.url(product);
  const fallback: PriceEntry = { store: store.store, price: null, product_name: "", url: searchUrl };

  try {
    const data = await runTinyfishAgent(searchUrl, buildPriceGoal(product), undefined, store.profile);
    const result = (data.result as Record<string, unknown>) || {};

    const productName = typeof result.product_name === "string" ? result.product_name : "";
    const priceRaw = typeof result.price === "string" ? result.price : String(result.price ?? "");
    const productUrl = typeof result.product_url === "string" ? result.product_url : "";
    const price = parsePrice(priceRaw);

    if (!productName && price === null) {
      console.log(`[pricing] ${store.store}: no matching product found`);
      return fallback;
    }

    console.log(`[pricing] ${store.store}: ${price !== null ? `$${price}` : "no price"} — ${productName}`);
    return {
      store: store.store,
      price,
      product_name: productName,
      url: productUrl || searchUrl,
    };
  } catch (e) {
    console.error(`[pricing] ${store.store} failed:`, e instanceof Error ? e.message : e);
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const { product } = await req.json();
  console.log(`[pricing] Fetching SG prices for "${product}" from ${STORES.length} stores`);

  // Run all stores in parallel — only 3 stores so no need for a worker queue
  const prices = await Promise.all(
    STORES.map((store) => fetchStorePrice(store, product))
  );

  console.log(`[pricing] Done. ${prices.filter((p) => p.price !== null).length}/${prices.length} prices found`);
  return NextResponse.json({ prices });
}
