"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import ReportCard from "@/components/ReportCard";
import SourceCard from "@/components/SourceCard";
import { ReviewReport, ScrapedSource } from "@/lib/types";

function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [status, setStatus] = useState<"idle" | "identifying" | "scraping" | "synthesizing" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [sources, setSources] = useState<ScrapedSource[]>([]);
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) return;
    runPipeline();
  }, [query]);

  const runPipeline = async () => {
    try {
      // Step 1: Identify URLs via OpenAI
      setStatus("identifying");
      setStatusMessage(`Finding the best sources for "${query}"...`);

      const urlRes = await fetch("/api/identify-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query }),
      });
      const { urls }: { urls: { url: string; source_type: string; reason: string }[] } = await urlRes.json();

      // Step 2: Parallel TinyFish scraping
      setStatus("scraping");
      setStatusMessage(`Scraping ${urls.length} sources in parallel...`);

      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query, urls }),
      });
      const { sources: scrapedSources }: { sources: ScrapedSource[] } = await scrapeRes.json();
      setSources(scrapedSources);

      // Step 3: Synthesize report via OpenAI
      setStatus("synthesizing");
      setStatusMessage("Synthesizing the real verdict...");

      const reportRes = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query, sources: scrapedSources }),
      });
      const { report: finalReport }: { report: ReviewReport } = await reportRes.json();
      setReport(finalReport);
      setStatus("done");

    } catch (err) {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <a href="/" className="text-gray-500 hover:text-white text-sm mb-8 inline-block">← Back</a>
      <h1 className="text-3xl font-bold mb-2">
        Reviews for <span className="text-blue-400">{query}</span>
      </h1>

      {/* Status */}
      {status !== "done" && status !== "error" && (
        <div className="mt-8 flex items-center gap-3 text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>{statusMessage}</span>
        </div>
      )}

      {status === "error" && (
        <div className="mt-8 text-red-400">{error}</div>
      )}

      {/* Report */}
      {report && <ReportCard report={report} product={query} />}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Sources Analysed</h2>
          <div className="grid gap-4">
            {sources.map((source, i) => (
              <SourceCard key={i} source={source} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-gray-400">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
