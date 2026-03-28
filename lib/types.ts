export interface TargetUrl {
  url: string;
  source_type: "reddit" | "reddit_2" | "youtube" | "youtube_2" | "trustpilot" | "forum" | "twitter" | "amazon" | "other";
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

export interface AgentState {
  index: number;
  url: string;
  source_type: string;
  status: "queued" | "running" | "done" | "failed";
  streaming_url?: string;
  progress?: string;
  progress_percent?: number;
  source?: ScrapedSource;
}

export interface ComparisonReport {
  winner_overall: "product_a" | "product_b" | "tie";
  winner_value: "product_a" | "product_b" | "tie";
  strengths_a: string[];
  strengths_b: string[];
  weaknesses_a: string[];
  weaknesses_b: string[];
  best_for_a: string;
  best_for_b: string;
  final_recommendation: string;
  summary: string;
}
