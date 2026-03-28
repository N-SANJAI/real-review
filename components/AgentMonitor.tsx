"use client";

import { useState } from "react";
import { AgentState } from "@/lib/types";

interface AgentMonitorProps {
  agents: AgentState[];
  title?: string;
}

const badgeColor: Record<string, string> = {
  reddit: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
  trustpilot: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  amazon: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  forum: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  youtube: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  twitter: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200",
};

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

function AgentCard({ agent }: { agent: AgentState }) {
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex">
        <TinyFishProgressBar status={agent.status} />
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4 py-3">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${badgeColor[agent.source_type] ?? badgeColor.other}`}
            >
              {agent.source_type}
            </span>
            <span className="flex-1 truncate text-sm text-slate-500 dark:text-slate-400">{agent.url}</span>
            <span className="flex-shrink-0">
              {agent.status === "queued" && (
                <span className="text-xs text-slate-400 dark:text-slate-500">queued</span>
              )}
              {agent.status === "running" && (
                <span className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
                  running
                </span>
              )}
              {agent.status === "done" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-300">
                  OK {agent.source?.reviews.length ?? 0} reviews
                </span>
              )}
              {agent.status === "failed" && (
                <span className="text-xs text-rose-600 dark:text-rose-300">failed</span>
              )}
            </span>
          </div>

          {agent.status === "running" && agent.progress && (
            <div className="truncate px-4 pb-2 text-xs text-slate-500 dark:text-slate-400">
              {agent.progress}
            </div>
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
                Open live browser view &rarr;
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
                Open in new tab &rarr;
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentMonitor({ agents, title = "Live Browser Agents" }: AgentMonitorProps) {
  if (agents.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-violet-600 dark:text-violet-300">
        {title}
      </h2>
      <div className="grid gap-3">
        {agents.map((agent) => (
          <AgentCard key={agent.index} agent={agent} />
        ))}
      </div>
    </div>
  );
}
