export interface TargetUrl {
  url: string;
  source_type: "reddit" | "trustpilot" | "forum" | "youtube" | "other";
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
  score: number; // out of 10
  pros: string[];
  cons: string[];
  red_flags: string[];
  summary: string;
}
