import { ScrapedSource } from "@/lib/types";

interface Props {
  source: ScrapedSource;
}

const sourceLabels: Record<string, string> = {
  reddit: "Reddit",
  trustpilot: "Trustpilot",
  forum: "Forum",
  youtube: "YouTube",
  other: "Web",
};

const sourceBadgeColors: Record<string, string> = {
  reddit: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
  trustpilot: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  forum: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  youtube: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
};

export default function SourceCard({ source }: Props) {
  const label = sourceLabels[source.source_type] || "Web";
  const badgeColor = sourceBadgeColors[source.source_type] || sourceBadgeColors.other;
  const failed = source.reviews.length === 0;

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
        <ul className="space-y-1">
          {source.reviews.slice(0, 3).map((review, i) => {
            const text = typeof review === "string" ? review : (review as Record<string, string>).text ?? JSON.stringify(review);
            return (
              <li key={i} className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                "{text}"
              </li>
            );
          })}
          {source.reviews.length > 3 && (
            <li className="text-xs text-slate-500 dark:text-slate-400">+{source.reviews.length - 3} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
