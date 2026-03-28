import { NextRequest, NextResponse } from "next/server";
import { runParallelAgents } from "@/lib/tinyfish";
import openai from "@/lib/openai";
import { PriceEntry } from "@/lib/types";

export const maxDuration = 300;

const STORES = [
  {
    store: "Amazon.sg",
    url: (q: string) => `https://www.amazon.sg/s?k=${encodeURIComponent(q)}`,
  },
  {
    store: "Shopee",
    url: (q: string) => `https://shopee.sg/search?keyword=${encodeURIComponent(q)}`,
  },
  {
    store: "Lazada",
    url: (q: string) => `https://www.lazada.sg/tag/${encodeURIComponent(q)}/`,
  },
  {
    store: "Courts",
    url: (q: string) => `https://www.courts.com.sg/catalogsearch/result/?q=${encodeURIComponent(q)}`,
  },
];

// Simple goal: just read what's on the page, no clicking
const EXTRACT_GOAL =
  `You are on a search results page. Extract the first 5 product listings visible on this page. ` +
  `For each listing, note the product name and price. Do NOT click any links. ` +
  `Return JSON: { "listings": [{"name": "product name", "price": "price as shown"}, ...] }. ` +
  `If no products are visible or the page is empty, return: { "listings": [] }`;

async function pickBestListing(
  product: string,
  store: string,
  listings: { name: string; price: string }[]
): Promise<{ product_name: string; price: number | null }> {
  if (listings.length === 0) return { product_name: "", price: null };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You match product listings to a user's search query. Pick the listing that is the ACTUAL product "${product}" (not an accessory, case, cable, or unrelated item). Return JSON: { "index": <0-based index of best match, or -1 if none match>, "price": <numeric price in SGD, or null>, "product_name": "<exact name from listing>" }`,
      },
      {
        role: "user",
        content: `Store: ${store}\nSearch query: "${product}"\n\nListings:\n${listings.map((l, i) => `${i}. ${l.name} — ${l.price}`).join("\n")}`,
      },
    ],
  });

  try {
    const json = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    if (json.index === -1 || json.index == null) return { product_name: "", price: null };
    const price = typeof json.price === "number" ? json.price : null;
    const product_name = typeof json.product_name === "string" ? json.product_name : listings[json.index]?.name ?? "";
    return { product_name, price };
  } catch {
    return { product_name: "", price: null };
  }
}

export async function POST(req: NextRequest) {
  const { product } = await req.json();
  console.log(`[pricing] Fetching SG prices for "${product}"`);

  const tasks = STORES.map((s) => ({
    url: s.url(product),
    goal: EXTRACT_GOAL,
  }));

  const results = await runParallelAgents(tasks, 4);

  // Extract raw listings from TinyFish results
  const rawListings = results.map((r, i) => {
    const store = STORES[i].store;
    if (r.status === "rejected") {
      console.error(`[pricing] ${store} TinyFish failed`);
      return { store, listings: [] as { name: string; price: string }[] };
    }
    const data = r.value as Record<string, unknown>;
    const result = (data.result as Record<string, unknown>) || {};
    const listings = Array.isArray(result.listings) ? result.listings as { name: string; price: string }[] : [];
    console.log(`[pricing] ${store}: ${listings.length} listings extracted`);
    return { store, listings };
  });

  // Use gpt-4o-mini in parallel to pick the right product from each store
  const picks = await Promise.all(
    rawListings.map((raw, i) =>
      pickBestListing(product, raw.store, raw.listings).then((pick) => ({
        store: raw.store,
        ...pick,
        url: STORES[i].url(product),
      }))
    )
  );

  const prices: PriceEntry[] = picks.map((p) => {
    console.log(`[pricing] ${p.store}: ${p.price !== null ? `$${p.price}` : "unavailable"} — ${p.product_name}`);
    return {
      store: p.store,
      price: p.price,
      product_name: p.product_name,
      url: p.url,
    };
  });

  return NextResponse.json({ prices });
}
