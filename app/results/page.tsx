"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import ReportCard from "@/components/ReportCard";
import SourceCard from "@/components/SourceCard";
import { ReviewReport, ScrapedSource } from "@/lib/types";

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
    reddit: "bg-orange-500/20 text-orange-300",
    trustpilot: "bg-green-500/20 text-green-300",
    forum: "bg-purple-500/20 text-purple-300",
    youtube: "bg-red-500/20 text-red-300",
    other: "bg-gray-500/20 text-gray-300",
  };

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${badgeColor[agent.source_type] ?? badgeColor.other}`}>
          {agent.source_type}
        </span>
        <span className="text-sm text-gray-400 truncate flex-1">{agent.url}</span>
        <span className="flex-shrink-0">
          {agent.status === "queued" && <span className="text-xs text-gray-600">queued</span>}
          {agent.status === "running" && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              running
            </span>
          )}
          {agent.status === "done" && (
            <span className="text-xs text-green-400">
              ✓ {agent.source?.reviews.length ?? 0} reviews
            </span>
          )}
          {agent.status === "failed" && <span className="text-xs text-red-400">✗ failed</span>}
        </span>
      </div>

      {/* Progress message */}
      {agent.status === "running" && agent.progress && (
        <div className="px-4 pb-2 text-xs text-gray-500 truncate">{agent.progress}</div>
      )}

      {/* Live browser iframe */}
      {agent.streaming_url && agent.status === "running" && !iframeError && (
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={agent.streaming_url}
            className="w-full h-full border-0"
            onError={() => setIframeError(true)}
            title={`Live browser: ${agent.url}`}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {/* Fallback link if iframe blocked */}
      {agent.streaming_url && agent.status === "running" && iframeError && (
        <div className="px-4 pb-3">
          <a
            href={agent.streaming_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 underline"
          >
            Open live browser view ↗
          </a>
        </div>
      )}

      {/* Link to open separately even when iframe works */}
      {agent.streaming_url && agent.status === "running" && !iframeError && (
        <div className="px-4 py-2 border-t border-white/5">
          <a
            href={agent.streaming_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Open in new tab ↗
          </a>
        </div>
      )}
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
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!query || started.current) return;
    started.current = true;
    runPipeline();
  }, [query]);

  const runPipeline = async () => {
    try {
      // Step 1: Identify URLs
      setStatus("identifying");
      setStatusMessage(`Finding the best sources for "${query}"...`);

      const urlRes = await fetch("/api/identify-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query }),
      });
      const { urls }: { urls: { url: string; source_type: string }[] } = await urlRes.json();

      // Initialise agent slots as queued
      setAgents(urls.map((u, i) => ({
        index: i,
        url: u.url,
        source_type: u.source_type,
        status: "queued",
      })));

      // Step 2: Stream scraping progress
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
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          const { type, index } = event as { type: string; index?: number };

          if (type === "agent_started" && index !== undefined) {
            setAgents((prev) =>
              prev.map((a) => a.index === index ? { ...a, status: "running" } : a)
            );
          }

          if (type === "agent_streaming" && index !== undefined) {
            const streaming_url = event.streaming_url as string;
            setAgents((prev) =>
              prev.map((a) => a.index === index ? { ...a, streaming_url } : a)
            );
          }

          if (type === "agent_progress" && index !== undefined) {
            const message = event.message as string;
            setAgents((prev) =>
              prev.map((a) => a.index === index ? { ...a, progress: message } : a)
            );
          }

          if (type === "agent_done" && index !== undefined) {
            const source = event.source as ScrapedSource;
            const failed = !!event.error;
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

      // Step 3: Synthesize
      setStatus("synthesizing");
      setStatusMessage("Synthesizing the real verdict...");

      const reportRes = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: query, sources: finalSources }),
      });
      const { report: finalReport }: { report: ReviewReport } = await reportRes.json();
      setReport(finalReport);
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
    <main className="max-w-4xl mx-auto px-4 py-12">
      <a href="/" className="text-gray-500 hover:text-white text-sm mb-8 inline-block">← Back</a>
      <h1 className="text-3xl font-bold mb-2">
        Reviews for <span className="text-blue-400">{query}</span>
      </h1>

      {/* Status line */}
      {status !== "done" && status !== "error" && (
        <div className="mt-6 flex items-center gap-3 text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>{statusMessage}</span>
          {queuedCount > 0 && (
            <span className="text-gray-600 text-sm">({queuedCount} queued)</span>
          )}
          {status === "scraping" && (
            <button
              onClick={async () => {
                await fetch("/api/cancel-runs", { method: "POST" });
                setError("Queue cleared — refresh to retry.");
                setStatus("error");
              }}
              className="ml-auto text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-1 rounded"
            >
              Clear queue & cancel
            </button>
          )}
        </div>
      )}

      {/* Live agent browser views */}
      {activeAgents.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Live Browser Agents</h2>
          <div className="grid gap-3">
            {activeAgents.map((agent) => (
              <AgentCard key={agent.index} agent={agent} />
            ))}
          </div>
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
