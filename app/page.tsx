"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    router.push(`/results?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-100">
        <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-fuchsia-400/25 blur-3xl dark:bg-violet-600/25" />
      </div>

      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200/80 bg-white/85 p-8 text-center shadow-xl shadow-cyan-100/70 backdrop-blur sm:p-12 dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-cyan-950/40">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
          Real insights · no paid fluff
        </p>
        <h1 className="mb-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 bg-clip-text text-5xl font-black text-transparent sm:text-6xl">
          The Real Review
        </h1>
        <p className="mb-10 text-lg text-slate-600 dark:text-slate-300">
          Honest reviews from real users — Reddit, forums, and beyond.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "Sony WH-1000XM5" or "Dyson V15"'
            className="flex-1 rounded-xl border border-slate-300 bg-white/95 px-5 py-4 text-lg text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-400/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 dark:disabled:from-slate-700 dark:disabled:to-slate-600"
          >
            {loading ? "..." : "Analyse"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Searches Reddit, Trustpilot, tech forums, and more in parallel.
        </p>
      </div>
    </main>
  );
}
