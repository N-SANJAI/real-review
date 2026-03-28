"use client";

import { useMemo, useState } from "react";
import { ReviewEntry, ScrapedSource } from "@/lib/types";

interface Props {
  source: ScrapedSource;
}

const sourceLabels: Record<string, string> = {
  reddit: "Reddit",
  trustpilot: "Trustpilot",
  forum: "Forum",
  youtube: "YouTube",
  twitter: "Twitter/X",
  other: "Web",
};

const sourceBadgeColors: Record<string, string> = {
  reddit: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
  trustpilot: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  forum: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  youtube: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  twitter: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
};

export default function SourceCard({ source }: Props) {
  const label = sourceLabels[source.source_type] || "Web";
  const badgeColor = sourceBadgeColors[source.source_type] || sourceBadgeColors.other;
  const failed = source.reviews.length === 0;
  const [sortBy, setSortBy] = useState<"top" | "bottom" | "newest" | "oldest">("top");
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedReviews = useMemo<ReviewEntry[]>(
    () =>
      source.reviews
        .map((review) => {
          if (typeof review === "string") {
            return { text: review };
          }
          return review;
        })
        .filter((review) => Boolean(review?.text)),
    [source.reviews]
  );

  const filteredAndSorted = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = normalizedReviews.filter((review) => {
      if (!query) return true;
      return review.text.toLowerCase().includes(query);
    });

    const withIndexAndScore = filtered.map((review, index) => ({
      review,
      index,
      sentimentScore: scoreSentiment(review),
      parsedDate: parseDate(review.date),
    }));

    withIndexAndScore.sort((a, b) => {
      if (sortBy === "top") return b.sentimentScore - a.sentimentScore;
      if (sortBy === "bottom") return a.sentimentScore - b.sentimentScore;

      if (sortBy === "newest") {
        if (a.parsedDate && b.parsedDate) return b.parsedDate - a.parsedDate;
        if (a.parsedDate) return -1;
        if (b.parsedDate) return 1;
        return a.index - b.index;
      }

      if (a.parsedDate && b.parsedDate) return a.parsedDate - b.parsedDate;
      if (a.parsedDate) return -1;
      if (b.parsedDate) return 1;
      return a.index - b.index;
    });

    return withIndexAndScore.map(({ review }) => review);
  }, [normalizedReviews, searchTerm, sortBy]);

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition ${failed ? "border-slate-200 bg-slate-50/70 opacity-70 dark:border-slate-800 dark:bg-slate-900/40" : "border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
            {label}
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-xs truncate text-xs text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            {source.url}
          </a>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {failed ? "Failed" : `${source.reviews.length} reviews`}
        </span>
      </div>

      {source.credibility_notes && (
        <p className="mb-2 text-xs text-amber-600 dark:text-amber-300">⚡ {source.credibility_notes}</p>
      )}

      {!failed && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter comments by keyword…"
              className="w-full rounded-md border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-3 py-2 text-xs font-medium tracking-wide text-slate-700 shadow-sm focus:border-cyan-400 focus:outline-none dark:border-cyan-900/70 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950/40 dark:text-slate-200 sm:max-w-xs"
              style={{ fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif" }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "top" | "bottom" | "newest" | "oldest")}
              className="rounded-md border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-3 py-2 text-xs font-medium tracking-wide text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none dark:border-violet-900/70 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-violet-950/40 dark:text-slate-200"
              style={{ fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif" }}
            >
              <option value="top">Sort: Top (Positive)</option>
              <option value="bottom">Sort: Bottom (Negative)</option>
              <option value="newest">Sort: Date (Newest)</option>
              <option value="oldest">Sort: Date (Oldest)</option>
            </select>
          </div>

          {filteredAndSorted.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No comments match that filter.</p>
          ) : (
            <ul className="space-y-2.5">
              {filteredAndSorted.slice(0, 5).map((review, i) => {
                const sentimentScore = scoreSentiment(review);
                const sentimentStyle = getSentimentStyle(sentimentScore);
                return (
                <li
                  key={`${review.text}-${i}`}
                  className={`rounded-lg border px-3 py-2 text-xs ${sentimentStyle.container}`}
                >
                  <p className="line-clamp-3 leading-relaxed">&quot;{review.text}&quot;</p>
                  {review.date && <p className="text-[11px] text-slate-500 dark:text-slate-400">{review.date}</p>}
                </li>
              )})}
              {filteredAndSorted.length > 5 && (
                <li className="text-xs text-slate-500 dark:text-slate-400">+{filteredAndSorted.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const positiveWords = [
  "love",
  "great",
  "amazing",
  "excellent",
  "best",
  "awesome",
  "perfect",
  "fantastic",
  "solid",
  "recommend",
  "worth",
  "comfortable",
  "good",
  "impressive",
  "premium",
  "quality",
];

const negativeWords = [
  "bad",
  "worst",
  "terrible",
  "hate",
  "broke",
  "broken",
  "cheap",
  "disappointing",
  "issue",
  "problem",
  "return",
  "refund",
  "waste",
  "overpriced",
  "uncomfortable",
  "flimsy",
  "defect",
];

function scoreSentiment(review: ReviewEntry): number {
  const lower = review.text.toLowerCase();
  const positiveHits = positiveWords.filter((word) => lower.includes(word)).length;
  const negativeHits = negativeWords.filter((word) => lower.includes(word)).length;
  const ratingBoost = typeof review.rating === "number" ? review.rating - 3 : 0;
  return positiveHits - negativeHits + ratingBoost;
}

function parseDate(date?: string | null): number | null {
  if (!date) return null;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? null : parsed;
}

function getSentimentStyle(score: number): { container: string } {
  if (score > 0) {
    return {
      container: "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-100",
    };
  }

  if (score < 0) {
    return {
      container: "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100",
    };
  }

  return {
    container: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100",
  };
}
