"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "repograph-theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme ? savedTheme === "dark" : prefersDark;
    setIsDark(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme ? "dark" : "light");
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg border border-slate-300 bg-white/70 p-2 text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {mounted && isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
        </svg>
      )}
    </button>
  );
}
