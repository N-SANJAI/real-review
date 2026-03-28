export interface TargetUrl {
  url: string;
  source_type: "reddit" | "trustpilot" | "forum" | "youtube" | "amazon" | "other";
  reason: string;
}

export interface ScrapedSource {
  url: string;
  source_type: string;
  reviews: string[];
  credibility_notes: string;
  raw_result: unknown;
}

export interface ReviewReport {
  verdict: string;
  score: number; // out of 10
  pros: string[];
  cons: string[];
  red_flags: string[];
  summary: string;
}
