export interface TargetUrl {
  url: string;
  source_type: "reddit" | "trustpilot" | "forum" | "youtube" | "twitter" | "amazon" | "other";
  reason: string;
}

export interface ScrapedSource {
  url: string;
  source_type: string;
  reviews: ReviewEntry[];
  credibility_notes: string;
  raw_result: unknown;
}

export interface ReviewEntry {
  text: string;
  rating?: number | null;
  date?: string | null;
  score?: number | null;
}

export interface ReviewReport {
  verdict: string;
  score: number; // out of 100
  pros: string[];
  cons: string[];
  red_flags: string[];
  summary: string;
}

export interface PriceEntry {
  store: string;
  price: number | null;
  product_name: string;
  url: string;
}

export interface PriceAnalysis {
  best_price: PriceEntry | null;
  all_prices: PriceEntry[];
  worth_it: boolean;
  verdict: string;
  recommended_price: string | null;
}
