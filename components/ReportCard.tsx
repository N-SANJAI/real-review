import { ReviewReport } from "@/lib/types";

interface Props {
  report: ReviewReport;
  product: string;
}

export default function ReportCard({ report, product }: Props) {
  const scoreColor =
    report.score >= 75
      ? "text-emerald-500 dark:text-emerald-300"
      : report.score >= 50
      ? "text-amber-500 dark:text-amber-300"
      : "text-rose-500 dark:text-rose-300";

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-cyan-950/30">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Verdict · {product}</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{report.verdict}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{report.summary}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-slate-100 px-4 py-3 text-center dark:bg-slate-800">
          <p className={`text-5xl font-bold ${scoreColor}`}>{report.score}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">/ 100</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <p className="mb-3 text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-300">Pros</p>
          <ul className="space-y-2">
            {report.pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-emerald-900 dark:text-emerald-100">
                <span className="mt-0.5 text-emerald-500 dark:text-emerald-300">✓</span>
                {pro}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/60 dark:bg-rose-950/30">
          <p className="mb-3 text-xs uppercase tracking-widest text-rose-600 dark:text-rose-300">Cons</p>
          <ul className="space-y-2">
            {report.cons.map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-rose-900 dark:text-rose-100">
                <span className="mt-0.5 text-rose-500 dark:text-rose-300">✗</span>
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {report.red_flags && report.red_flags.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/70 dark:bg-amber-950/30">
          <p className="mb-3 text-xs uppercase tracking-widest text-amber-700 dark:text-amber-300">⚠ Red Flags</p>
          <ul className="space-y-2">
            {report.red_flags.map((flag, i) => (
              <li key={i} className="text-sm text-amber-900 dark:text-amber-100">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
