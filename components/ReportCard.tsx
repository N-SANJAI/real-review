import { ReviewReport } from "@/lib/types";

interface Props {
  report: ReviewReport;
  product: string;
}

export default function ReportCard({ report, product }: Props) {
  const scoreColor =
    report.score >= 8
      ? "text-green-400"
      : report.score >= 6
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="mt-8 space-y-6">
      {/* Verdict + Score */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Verdict</p>
          <p className="text-xl font-semibold text-white">{report.verdict}</p>
          <p className="text-gray-400 mt-3 text-sm leading-relaxed">{report.summary}</p>
        </div>
        <div className="text-center shrink-0">
          <p className={`text-5xl font-bold ${scoreColor}`}>{report.score}</p>
          <p className="text-gray-500 text-xs mt-1">/ 10</p>
        </div>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-green-500 mb-3">Pros</p>
          <ul className="space-y-2">
            {report.pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5">✓</span>
                {pro}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-red-400 mb-3">Cons</p>
          <ul className="space-y-2">
            {report.cons.map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-red-400 mt-0.5">✗</span>
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Red Flags */}
      {report.red_flags && report.red_flags.length > 0 && (
        <div className="bg-red-950 border border-red-900 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-red-400 mb-3">⚠ Red Flags</p>
          <ul className="space-y-2">
            {report.red_flags.map((flag, i) => (
              <li key={i} className="text-sm text-red-300">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
