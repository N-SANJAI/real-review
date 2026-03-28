"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "real-review-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = saved ?? (preferredDark ? "dark" : "light");

    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!mounted}
      className="fixed right-4 top-4 z-50 rounded-full border border-violet-300/70 bg-white/90 px-4 py-2 text-sm font-semibold text-violet-700 shadow-lg shadow-violet-300/30 backdrop-blur transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-300/20 dark:bg-slate-900/90 dark:text-violet-200 dark:shadow-violet-900/30 dark:hover:bg-slate-800"
      aria-label="Toggle dark and light mode"
    >
      {mounted ? (theme === "dark" ? "☀️ Light" : "🌙 Dark") : "Theme"}
    </button>
  );
}
