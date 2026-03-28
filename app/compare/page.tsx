"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AgentMonitor from "@/components/AgentMonitor";
import ComparisonCard from "@/components/ComparisonCard";
import PricingCard from "@/components/PricingCard";
import ReportCard from "@/components/ReportCard";
import SourceCard from "@/components/SourceCard";
import {
  AgentState,
  ComparisonReport,
  PriceAnalysis,
  ReviewReport,
  ScrapedSource,
} from "@/lib/types";

type PipelineStatus = "idle" | "identifying" | "scraping" | "synthesizing" | "done" | "error";

interface ProductRunState {
  status: PipelineStatus;
  statusMessage: string;
  agents: AgentState[];
  sources: ScrapedSource[];
  report: ReviewReport | null;
  pricing: PriceAnalysis | null;
  pricingLoading: boolean;
  error: string;
}

const emptyState: ProductRunState = {
  status: "idle",
  statusMessage: "",
  agents: [],
  sources: [],
  report: null,
  pricing: null,
  pricingLoading: false,
  error: "",
};

function buildInitialState(): ProductRunState {
  return { ...emptyState, agents: [], sources: [] };
}

async function runProductPipeline(
  product: string,
  setState: Dispatch<SetStateAction<ProductRunState>>,
  options?: { clearQueue?: boolean }
) {
  setState((prev) => ({
    ...prev,
    status: "identifying",
    statusMessage: `Finding the best sources for "${product}"...`,
    error: "",
  }));

  const urlRes = await fetch("/api/identify-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product }),
  });
  const { urls }: { urls: { url: string; source_type: string }[] } = await urlRes.json();

  setState((prev) => ({
    ...prev,
    status: "scraping",
    statusMessage: `Running ${urls.length} browser agents...`,
    agents: urls.map((u, i) => ({
      index: i,
      url: u.url,
      source_type: u.source_type,
      status: "queued",
    })),
  }));

  const scrapeRes = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product, urls, clearQueue: options?.clearQueue ?? true }),
  });

  const reader = scrapeRes.body?.getReader();
  if (!reader) {
    throw new Error("Scrape stream was not available.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalSources: ScrapedSource[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }

      const { type, index } = event as { type: string; index?: number };

      if (type === "agent_started" && index !== undefined) {
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) => (a.index === index ? { ...a, status: "running" } : a)),
        }));
      }

      if (type === "agent_streaming" && index !== undefined) {
        const streamingUrl = event.streaming_url as string;
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a.index === index ? { ...a, streaming_url: streamingUrl } : a
          ),
        }));
      }

      if (type === "agent_progress" && index !== undefined) {
        const message = event.message as string;
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) => (a.index === index ? { ...a, progress: message } : a)),
        }));
      }

      if (type === "agent_done" && index !== undefined) {
        const source = event.source as ScrapedSource;
        const failed = Boolean(event.error);
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a.index === index
              ? { ...a, status: failed ? "failed" : "done", source, streaming_url: undefined }
              : a
          ),
        }));
      }

      if (type === "done") {
        finalSources = event.sources as ScrapedSource[];
        setState((prev) => ({ ...prev, sources: finalSources }));
      }
    }
  }

  setState((prev) => ({
    ...prev,
    status: "synthesizing",
    statusMessage: "Synthesizing the real verdict...",
    pricingLoading: true,
  }));

  const [reportRes, fetchedPrices] = await Promise.all([
    fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, sources: finalSources }),
    }).then((r) => r.json()),
    fetch("/api/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    })
      .then((r) => r.json())
      .then((d) => d.prices)
      .catch(() => null),
  ]);

  const report = reportRes.report as ReviewReport;
  let pricing: PriceAnalysis | null = null;

  if (fetchedPrices) {
    try {
      const analysisRes = await fetch("/api/price-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, prices: fetchedPrices, report }),
      });
      const data = await analysisRes.json();
      pricing = data.analysis as PriceAnalysis;
    } catch {
      console.error(`Price analysis failed for ${product}`);
    }
  }

  setState((prev) => ({
    ...prev,
    status: "done",
    statusMessage: "Finished.",
    report,
    pricing,
    pricingLoading: false,
    agents: [],
  }));
}

function statusTone(status: PipelineStatus) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  if (status === "idle") return "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300";
  return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-200";
}

function statusLabel(status: PipelineStatus) {
  if (status === "identifying") return "Finding sources";
  if (status === "scraping") return "Running agents";
  if (status === "synthesizing") return "Synthesizing";
  if (status === "done") return "Ready";
  if (status === "error") return "Needs attention";
  return "Waiting";
}

function ProductPanel({
  title,
  accent,
  product,
  state,
}: {
  title: string;
  accent: string;
  product: string;
  state: ProductRunState;
}) {
  const activeAgents = state.agents.filter((agent) => agent.status !== "queued");
  const queuedCount = state.agents.filter((agent) => agent.status === "queued").length;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-lg shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-cyan-950/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50 to-slate-100 px-5 py-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className={`text-xs uppercase tracking-[0.18em] ${accent}`}>{title}</p>
            <h2 className="mt-2 break-words text-2xl font-bold text-slate-900 dark:text-slate-50">
              {product}
            </h2>
          </div>
          <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(state.status)}`}>
            {statusLabel(state.status)}
          </span>
        </div>

        {state.status !== "idle" && state.status !== "done" && state.status !== "error" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <span className="break-words">{state.statusMessage}</span>
            {queuedCount > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{queuedCount} queued</span>
            )}
          </div>
        )}

        {state.error && (
          <p className="mt-4 break-words text-sm text-rose-600 dark:text-rose-300">{state.error}</p>
        )}
      </div>

      <div className="space-y-6 px-5 py-5">
        <AgentMonitor agents={activeAgents} title={`${title} live agents`} />

        {(state.report || state.pricingLoading || state.pricing) && (
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              {state.report && <ReportCard report={state.report} product={product} />}
            </div>
            <div className="min-w-0">
              {state.pricing ? (
                <PricingCard analysis={state.pricing} />
              ) : state.pricingLoading ? (
                <PricingCard
                  analysis={{
                    best_price: null,
                    all_prices: [],
                    worth_it: false,
                    verdict: "",
                    recommended_price: null,
                  }}
                  loading
                />
              ) : null}
            </div>
          </div>
        )}

        {state.sources.length > 0 && (
          <details className="group rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <span className="break-words">View scraped sources for {product}</span>
                <span className="text-xs text-slate-500 transition group-open:rotate-180 dark:text-slate-400">
                  ▼
                </span>
              </div>
            </summary>
            <div className="mt-4 grid gap-4">
              {state.sources.map((source, index) => (
                <SourceCard key={`${source.url}-${index}`} source={source} />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProductA = searchParams.get("a") || "";
  const initialProductB = searchParams.get("b") || "";

  const [productAInput, setProductAInput] = useState(initialProductA);
  const [productBInput, setProductBInput] = useState(initialProductB);
  const [productAState, setProductAState] = useState<ProductRunState>(buildInitialState);
  const [productBState, setProductBState] = useState<ProductRunState>(buildInitialState);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const lastRunKey = useRef("");

  useEffect(() => {
    setProductAInput(initialProductA);
    setProductBInput(initialProductB);
  }, [initialProductA, initialProductB]);

  useEffect(() => {
    const productA = initialProductA.trim();
    const productB = initialProductB.trim();

    if (!productA || !productB) return;

    const runKey = `${productA}::${productB}`;
    if (lastRunKey.current === runKey) return;
    lastRunKey.current = runKey;

    setProductAState(buildInitialState());
    setProductBState(buildInitialState());
    setComparison(null);
    setComparisonError("");

    void (async () => {
      try {
        await fetch("/api/cancel-runs", { method: "POST" });

        await Promise.all([
          runProductPipeline(productA, setProductAState, { clearQueue: false }).catch((error) => {
            console.error(error);
            setProductAState((prev) => ({
              ...prev,
              status: "error",
              pricingLoading: false,
              error: "This product could not be fully analysed.",
            }));
          }),
          runProductPipeline(productB, setProductBState, { clearQueue: false }).catch((error) => {
            console.error(error);
            setProductBState((prev) => ({
              ...prev,
              status: "error",
              pricingLoading: false,
              error: "This product could not be fully analysed.",
            }));
          }),
        ]);
      } finally {
        setComparisonLoading(true);
      }
    })();
  }, [initialProductA, initialProductB]);

  useEffect(() => {
    if (!comparisonLoading) return;
    if (!initialProductA || !initialProductB) return;

    if (!productAState.report || !productBState.report) {
      setComparisonLoading(false);
      setComparisonError("A side-by-side verdict needs both product reports to finish.");
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productA: initialProductA,
            reportA: productAState.report,
            pricingA: productAState.pricing,
            productB: initialProductB,
            reportB: productBState.report,
            pricingB: productBState.pricing,
          }),
        });
        const data = await response.json();
        setComparison(data.comparison as ComparisonReport);
      } catch (error) {
        console.error(error);
        setComparisonError("The head-to-head verdict could not be generated.");
      } finally {
        setComparisonLoading(false);
      }
    })();
  }, [
    comparisonLoading,
    initialProductA,
    initialProductB,
    productAState.report,
    productAState.pricing,
    productBState.report,
    productBState.pricing,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const productA = productAInput.trim();
    const productB = productBInput.trim();
    if (!productA || !productB) return;

    lastRunKey.current = "";
    router.push(`/compare?a=${encodeURIComponent(productA)}&b=${encodeURIComponent(productB)}`);
  }

  const bothDone =
    (productAState.status === "done" || productAState.status === "error") &&
    (productBState.status === "done" || productBState.status === "error");

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-cyan-100/70 backdrop-blur sm:p-8 dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-cyan-950/40">
        <a
          href="/"
          className="text-sm text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300"
        >
          &larr; Back home
        </a>

        <div className="mt-5 grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="min-w-0">
            <p className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Auto Compare
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              Run both products through the same research pipeline.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              TinyFish gathers evidence for both products in parallel, the app synthesizes each report,
              checks current pricing, and then produces one clean recommendation.
            </p>

            {(initialProductA || initialProductB) && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20">
                  <p className="text-xs uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                    Product A
                  </p>
                  <p className="mt-2 break-words text-lg font-semibold text-slate-900 dark:text-white">
                    {initialProductA || "Waiting for input"}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
                  <p className="text-xs uppercase tracking-widest text-violet-700 dark:text-violet-300">
                    Product B
                  </p>
                  <p className="mt-2 break-words text-lg font-semibold text-slate-900 dark:text-white">
                    {initialProductB || "Waiting for input"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Start a comparison</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Product A
                </label>
                <input
                  type="text"
                  value={productAInput}
                  onChange={(event) => setProductAInput(event.target.value)}
                  placeholder='e.g. "Sony WH-1000XM5"'
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Product B
                </label>
                <input
                  type="text"
                  value={productBInput}
                  onChange={(event) => setProductBInput(event.target.value)}
                  placeholder='e.g. "Bose QuietComfort Ultra"'
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!productAInput.trim() || !productBInput.trim()}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-400/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500"
            >
              Compare products
            </button>
          </form>
        </div>
      </section>

      {initialProductA && initialProductB && (
        <div className="mt-8 space-y-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-lg shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-cyan-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Final Comparison
                </p>
                <h2 className="mt-2 break-words text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {initialProductA} vs {initialProductB}
                </h2>
              </div>
              {comparisonLoading && (
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                  <span>Comparing both finished reports...</span>
                </div>
              )}
            </div>

            {comparisonError && (
              <p className="mt-5 break-words text-sm text-rose-600 dark:text-rose-300">{comparisonError}</p>
            )}

            {comparison && (
              <div className="mt-6">
                <ComparisonCard
                  comparison={comparison}
                  productA={initialProductA}
                  productB={initialProductB}
                />
              </div>
            )}

            {!comparison && !comparisonLoading && !comparisonError && bothDone && (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Waiting for both product reports before generating a final verdict.
              </p>
            )}
          </section>

          <div className="grid gap-6 2xl:grid-cols-2">
            <ProductPanel
              title="Product A"
              accent="text-cyan-600 dark:text-cyan-400"
              product={initialProductA}
              state={productAState}
            />
            <ProductPanel
              title="Product B"
              accent="text-violet-600 dark:text-violet-400"
              product={initialProductB}
              state={productBState}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-12 text-slate-500 dark:text-slate-300">Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}
