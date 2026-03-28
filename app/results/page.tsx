"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import ReportCard from "@/components/ReportCard";
import SourceCard from "@/components/SourceCard";
import PricingCard from "@/components/PricingCard";
import { ReviewReport, ScrapedSource, PriceAnalysis } from "@/lib/types";

interface AgentState {
  index: number;
  url: string;
  source_type: string;
  status: "queued" | "running" | "done" | "failed";
  streaming_url?: string;
  progress?: string;
  source?: ScrapedSource;
}

function AgentCard({ agent }: { agent: AgentState }) {
  const [iframeError, setIframeError] = useState(false);

  const badgeColor: Record<string, string> = {
    reddit: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
    trustpilot: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    amazon: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
    forum: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
    youtube: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
    twitter: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
    other: "bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex">
        <TinyFishProgressBar status={agent.status} />
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${badgeColor[agent.source_type] ?? badgeColor.other}`}>
              {agent.source_type}
            </span>
            <span className="flex-1 truncate text-sm text-slate-500 dark:text-slate-400">{agent.url}</span>
            <span className="flex-shrink-0">
              {agent.status === "queued" && <span className="text-xs text-slate-400 dark:text-slate-500">queued</span>}
              {agent.status === "running" && (
                <span className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
                  running
                </span>
              )}
              {agent.status === "done" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-300">
                  ✓ {agent.source?.reviews.length ?? 0} reviews
                </span>
              )}
              {agent.status === "failed" && <span className="text-xs text-rose-600 dark:text-rose-300">✗ failed</span>}
            </span>
          </div>

          {agent.status === "running" && agent.progress && (
            <div className="truncate px-4 pb-2 text-xs text-slate-500 dark:text-slate-400">{agent.progress}</div>
          )}

          {agent.streaming_url && agent.status === "running" && !iframeError && (
            <div className="relative bg-slate-100 dark:bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={agent.streaming_url}
                className="h-full w-full border-0"
                onError={() => setIframeError(true)}
                title={`Live browser: ${agent.url}`}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}

          {agent.streaming_url && agent.status === "running" && iframeError && (
            <div className="px-4 pb-3">
              <a
                href={agent.streaming_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 underline dark:text-cyan-300"
              >
                Open live browser view ↗
              </a>
            </div>
          )}

          {agent.streaming_url && agent.status === "running" && !iframeError && (
            <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-800">
              <a
                href={agent.streaming_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Open in new tab ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TinyFishProgressBar({ status }: { status: AgentState["status"] }) {
  const running = status === "running";
  const done = status === "done";

  return (
    <div className="tinyfish-bar-container relative m-2 mr-0 w-6 overflow-hidden rounded-full border border-cyan-200/80 bg-cyan-50/70 dark:border-cyan-900/80 dark:bg-slate-950">
      <div
        className={`tinyfish-water-layer absolute inset-x-0 bottom-0 ${
          done ? "h-full" : running ? "tinyfish-water-fill" : "h-0"
        }`}
      />
      {running && (
        <div className="pointer-events-none absolute inset-0">
          <span className="tinyfish-food-drop left-1 top-0 [animation-delay:0s]" />
          <span className="tinyfish-food-drop left-3.5 top-0 [animation-delay:1.1s]" />
          <span className="tinyfish-food-drop left-2 top-0 [animation-delay:2s]" />
        </div>
      )}
      {done && <div className="absolute inset-0 bg-emerald-300/15" />}
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [status, setStatus] = useState<"idle" | "identifying" | "scraping" | "synthesizing" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [sources, setSources] = useState<ScrapedSource[]>([]);
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!query || started.current) return;
    started.current = true;
    runPipeline();
  }, [query]);

  const runPipeline = async () => {
    try {
      setStatus("identifying");
      setStatusMessage(`Finding the best sources for "${query}"...`);

      const urlRes = await fetch("/api/identify-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query }),
      });
      const { urls }: { urls: { url: string; source_type: string }[] } = await urlRes.json();

      setAgents(
        urls.map((u, i) => ({
          index: i,
          url: u.url,
          source_type: u.source_type,
          status: "queued",
        }))
      );

      setStatus("scraping");
      setStatusMessage(`Running ${urls.length} browser agents...`);

      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query, urls }),
      });

      const reader = scrapeRes.body!.getReader();
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
            setAgents((prev) => prev.map((a) => (a.index === index ? { ...a, status: "running" } : a)));
          }

          if (type === "agent_streaming" && index !== undefined) {
            const streaming_url = event.streaming_url as string;
            setAgents((prev) => prev.map((a) => (a.index === index ? { ...a, streaming_url } : a)));
          }

          if (type === "agent_progress" && index !== undefined) {
            const message = event.message as string;
            setAgents((prev) => prev.map((a) => (a.index === index ? { ...a, progress: message } : a)));
          }

          if (type === "agent_done" && index !== undefined) {
            const source = event.source as ScrapedSource;
            const failed = !!event.error;
            setAgents((prev) =>
              prev.map((a) =>
                a.index === index ? { ...a, status: failed ? "failed" : "done", source, streaming_url: undefined } : a
              )
            );
          }

          if (type === "done") {
            finalSources = event.sources as ScrapedSource[];
            setSources(finalSources);
          }
        }
      }

      setStatus("synthesizing");
      setStatusMessage("Synthesizing the real verdict...");

      // Run OpenAI synthesis and pricing fetch in parallel
      // (synthesis is just an OpenAI call, pricing uses TinyFish — no conflict)
      setPricingLoading(true);
      const [reportRes, fetchedPrices] = await Promise.all([
        fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: query, sources: finalSources }),
        }).then((r) => r.json()),
        fetch("/api/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: query }),
        })
          .then((r) => r.json())
          .then((d) => d.prices)
          .catch(() => null),
      ]);

      const finalReport: ReviewReport = reportRes.report;
      setReport(finalReport);

      // Run price analysis if we got prices
      if (fetchedPrices) {
        try {
          const analysisRes = await fetch("/api/price-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product: query, prices: fetchedPrices, report: finalReport }),
          });
          const { analysis } = await analysisRes.json();
          setPriceAnalysis(analysis);
        } catch {
          console.error("Price analysis failed");
        }
      }
      setPricingLoading(false);

      setStatus("done");
      setAgents([]);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const activeAgents = agents.filter((a) => a.status !== "queued");
  const queuedCount = agents.filter((a) => a.status === "queued").length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-cyan-100/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-cyan-950/30">
        <a href="/" className="mb-5 inline-block text-sm text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300">← Back</a>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
          Reviews for <span className="bg-gradient-to-r from-cyan-500 to-violet-600 bg-clip-text text-transparent">{query}</span>
        </h1>

        {status !== "done" && status !== "error" && (
          <div className="mt-6 flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <span>{statusMessage}</span>
            {queuedCount > 0 && <span className="text-sm text-slate-500 dark:text-slate-400">({queuedCount} queued)</span>}
            {status === "scraping" && (
              <button
                onClick={async () => {
                  await fetch("/api/cancel-runs", { method: "POST" });
                  setError("Queue cleared — refresh to retry.");
                  setStatus("error");
                }}
                className="ml-auto rounded border border-rose-300 px-2 py-1 text-xs text-rose-600 hover:border-rose-500 dark:border-rose-900 dark:text-rose-300"
              >
                Clear queue & cancel
              </button>
            )}
          </div>
        )}

        {activeAgents.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-violet-600 dark:text-violet-300">Live Browser Agents</h2>
            <div className="grid gap-3">
              {activeAgents.map((agent) => (
                <AgentCard key={agent.index} agent={agent} />
              ))}
            </div>
          </div>
        )}

        {status === "error" && <div className="mt-8 text-rose-600 dark:text-rose-300">{error}</div>}

        {(report || pricingLoading) && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {report && <ReportCard report={report} product={query} />}
            </div>
            <div className="lg:col-span-1">
              {priceAnalysis ? (
                <PricingCard analysis={priceAnalysis} />
              ) : pricingLoading ? (
                <PricingCard analysis={{ best_price: null, all_prices: [], worth_it: false, verdict: "", recommended_price: null }} loading />
              ) : null}
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-700 dark:text-slate-200">Sources Analysed</h2>
            <div className="grid gap-4">
              {sources.map((source, i) => (
                <SourceCard key={i} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-slate-500 dark:text-slate-300">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
