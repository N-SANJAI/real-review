import { PriceAnalysis } from "@/lib/types";

interface Props {
  analysis: PriceAnalysis;
  loading?: boolean;
}

export default function PricingCard({ analysis, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-cyan-950/30">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Fetching Singapore prices...</span>
      </div>
    );
  }

  const { best_price, all_prices, worth_it, verdict, recommended_price } = analysis;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-cyan-950/30">
      <p className="mb-4 text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
        Singapore Pricing
      </p>

      <div className="space-y-2">
        {all_prices.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.store}</p>
              {p.product_name && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{p.product_name}</p>
              )}
            </div>
            <div className="ml-3 shrink-0 text-right">
              {p.price !== null ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm font-semibold ${
                    best_price && p.store === best_price.store && p.price === best_price.price
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-slate-700 dark:text-slate-200"
                  } hover:underline`}
                >
                  SGD ${p.price.toFixed(2)}
                  {best_price && p.store === best_price.store && p.price === best_price.price && (
                    <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                      Best
                    </span>
                  )}
                </a>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">Unavailable</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-4 rounded-xl border p-4 ${
          worth_it
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              worth_it
                ? "text-emerald-700 dark:text-emerald-200"
                : "text-amber-700 dark:text-amber-200"
            }`}
          >
            {worth_it ? "Worth it" : "Consider waiting"}
          </span>
        </div>
        <p
          className={`mt-1 text-sm ${
            worth_it
              ? "text-emerald-800 dark:text-emerald-100"
              : "text-amber-800 dark:text-amber-100"
          }`}
        >
          {verdict}
        </p>
        {recommended_price && !worth_it && (
          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
            Recommended price: {recommended_price}
          </p>
        )}
      </div>

      {best_price && (
        <a
          href={best_price.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:shadow-md"
        >
          Buy at {best_price.store} — SGD ${best_price.price!.toFixed(2)} ↗
        </a>
      )}
    </div>
  );
}
