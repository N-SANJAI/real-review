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
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold mb-3 text-white">
          The Real Review
        </h1>
        <p className="text-gray-400 mb-10 text-lg">
          Honest reviews from real users — Reddit, forums, and beyond. No sponsored garbage.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "Sony WH-1000XM5" or "Dyson V15"'
            className="flex-1 px-5 py-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-lg"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-semibold text-lg transition-colors"
          >
            {loading ? "..." : "Analyse"}
          </button>
        </form>

        <p className="text-gray-600 text-sm mt-6">
          Searches Reddit, Trustpilot, tech forums, and more in parallel
        </p>
      </div>
    </main>
  );
}
