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
  reddit: "bg-orange-900 text-orange-300",
  trustpilot: "bg-green-900 text-green-300",
  forum: "bg-purple-900 text-purple-300",
  youtube: "bg-red-900 text-red-300",
  other: "bg-gray-800 text-gray-300",
};

export default function SourceCard({ source }: Props) {
  const label = sourceLabels[source.source_type] || "Web";
  const badgeColor = sourceBadgeColors[source.source_type] || sourceBadgeColors.other;
  const failed = source.reviews.length === 0;

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 ${failed ? "border-gray-800 opacity-50" : "border-gray-800"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {label}
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-300 truncate max-w-xs"
          >
            {source.url}
          </a>
        </div>
        <span className="text-xs text-gray-600">
          {failed ? "Failed" : `${source.reviews.length} reviews`}
        </span>
      </div>

      {source.credibility_notes && (
        <p className="text-xs text-yellow-600 mb-2">⚡ {source.credibility_notes}</p>
      )}

      {!failed && (
        <ul className="space-y-1">
          {source.reviews.slice(0, 3).map((review, i) => (
            <li key={i} className="text-xs text-gray-400 line-clamp-2">
              "{review}"
            </li>
          ))}
          {source.reviews.length > 3 && (
            <li className="text-xs text-gray-600">+{source.reviews.length - 3} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
