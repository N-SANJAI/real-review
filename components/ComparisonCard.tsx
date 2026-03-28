import { ComparisonReport } from "@/lib/types";

interface Props {
  comparison: ComparisonReport;
  productA: string;
  productB: string;
}

function winnerLabel(
  winner: ComparisonReport["winner_overall"] | ComparisonReport["winner_value"],
  productA: string,
  productB: string
) {
  if (winner === "product_a") return productA;
  if (winner === "product_b") return productB;
  return "Tie";
}

function ComparisonList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm leading-relaxed">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ComparisonCard({ comparison, productA, productB }: Props) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-cyan-950/30">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
          Head to Head Verdict
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20">
            <p className="text-xs uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              Best Overall
            </p>
            <p className="mt-2 break-words text-lg font-semibold text-slate-900 dark:text-white">
              {winnerLabel(comparison.winner_overall, productA, productB)}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
            <p className="text-xs uppercase tracking-widest text-violet-700 dark:text-violet-300">
              Best Value
            </p>
            <p className="mt-2 break-words text-lg font-semibold text-slate-900 dark:text-white">
              {winnerLabel(comparison.winner_value, productA, productB)}
            </p>
          </div>
        </div>

        <p className="mt-5 break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {comparison.summary}
        </p>

        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 break-words text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          {comparison.final_recommendation}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Product A
          </p>
          <h3 className="mt-2 break-words text-2xl font-bold text-slate-900 dark:text-slate-50">
            {productA}
          </h3>
          <p className="mt-3 break-words text-sm leading-relaxed text-emerald-950 dark:text-emerald-100">
            {comparison.best_for_a}
          </p>

          <div className="mt-5 text-emerald-950 dark:text-emerald-100">
            <p className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              Strengths
            </p>
            <ComparisonList items={comparison.strengths_a} />
          </div>

          <div className="mt-5 text-rose-950 dark:text-rose-100">
            <p className="text-xs uppercase tracking-widest text-rose-700 dark:text-rose-300">
              Watch Outs
            </p>
            <ComparisonList items={comparison.weaknesses_a} />
          </div>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50/80 p-6 dark:border-blue-900/60 dark:bg-blue-950/20">
          <p className="text-xs uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
            Product B
          </p>
          <h3 className="mt-2 break-words text-2xl font-bold text-slate-900 dark:text-slate-50">
            {productB}
          </h3>
          <p className="mt-3 break-words text-sm leading-relaxed text-blue-950 dark:text-blue-100">
            {comparison.best_for_b}
          </p>

          <div className="mt-5 text-blue-950 dark:text-blue-100">
            <p className="text-xs uppercase tracking-widest text-blue-700 dark:text-blue-300">
              Strengths
            </p>
            <ComparisonList items={comparison.strengths_b} />
          </div>

          <div className="mt-5 text-rose-950 dark:text-rose-100">
            <p className="text-xs uppercase tracking-widest text-rose-700 dark:text-rose-300">
              Watch Outs
            </p>
            <ComparisonList items={comparison.weaknesses_b} />
          </div>
        </div>
      </div>
    </section>
  );
}
