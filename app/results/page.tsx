"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AgentMonitor from "@/components/AgentMonitor";
import PricingCard from "@/components/PricingCard";
import ReportCard from "@/components/ReportCard";
import SourceCard from "@/components/SourceCard";
import { AgentState, PriceAnalysis, ReviewReport, ScrapedSource } from "@/lib/types";

function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [status, setStatus] = useState<
    "idle" | "identifying" | "scraping" | "synthesizing" | "done" | "error"
  >("idle");
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
    void runPipeline();
  }, [query]);

  async function runPipeline() {
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
            setAgents((prev) => prev.map((a) => (a.index === index ? { ...a, status: "running" } : a)));
          }

          if (type === "agent_streaming" && index !== undefined) {
            const streamingUrl = event.streaming_url as string;
            setAgents((prev) =>
              prev.map((a) => (a.index === index ? { ...a, streaming_url: streamingUrl } : a))
            );
          }

          if (type === "agent_progress" && index !== undefined) {
            const message = event.message as string;
            setAgents((prev) => prev.map((a) => (a.index === index ? { ...a, progress: message } : a)));
          }

          if (type === "agent_done" && index !== undefined) {
            const source = event.source as ScrapedSource;
            const failed = Boolean(event.error);
            setAgents((prev) =>
              prev.map((a) =>
                a.index === index
                  ? { ...a, status: failed ? "failed" : "done", source, streaming_url: undefined }
                  : a
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
  }

  const activeAgents = agents.filter((a) => a.status !== "queued");
  const queuedCount = agents.filter((a) => a.status === "queued").length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-cyan-100/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-cyan-950/30">
        <a
          href="/"
          className="mb-5 inline-block text-sm text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300"
        >
          &larr; Back
        </a>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
          Reviews for{" "}
          <span className="bg-gradient-to-r from-cyan-500 to-violet-600 bg-clip-text text-transparent">
            {query}
          </span>
        </h1>

        {status !== "done" && status !== "error" && (
          <div className="mt-6 flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <span>{statusMessage}</span>
            {queuedCount > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">({queuedCount} queued)</span>
            )}
            {status === "scraping" && (
              <button
                onClick={async () => {
                  await fetch("/api/cancel-runs", { method: "POST" });
                  setError("Queue cleared - refresh to retry.");
                  setStatus("error");
                }}
                className="ml-auto rounded border border-rose-300 px-2 py-1 text-xs text-rose-600 hover:border-rose-500 dark:border-rose-900 dark:text-rose-300"
              >
                Clear queue and cancel
              </button>
            )}
          </div>
        )}

        <AgentMonitor agents={activeAgents} />

        {status === "error" && <div className="mt-8 text-rose-600 dark:text-rose-300">{error}</div>}

        {(report || pricingLoading) && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">{report && <ReportCard report={report} product={query} />}</div>
            <div className="lg:col-span-1">
              {priceAnalysis ? (
                <PricingCard analysis={priceAnalysis} />
              ) : pricingLoading ? (
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

        {sources.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-700 dark:text-slate-200">
              Sources Analysed
            </h2>
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
