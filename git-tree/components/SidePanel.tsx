"use client";

import { useEffect, useState } from "react";
import { getCachedSummary, setCachedSummary } from "@/lib/cache";

interface SidePanelProps {
  filePath: string | null;
  owner: string;
  repo: string;
  onClose: () => void;
}

export default function SidePanel({ filePath, owner, repo, onClose }: SidePanelProps) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!filePath) return;
    const controller = new AbortController();
    const cacheKey = `${owner}/${repo}/${filePath}`;

    async function loadSummary() {
      const cached = getCachedSummary(cacheKey);
      if (cached) {
        setSummary(cached);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setSummary("");
      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, path: filePath }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not generate a summary");
        setSummary(data.summary);
        setCachedSummary(cacheKey, data.summary);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Could not generate a summary");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSummary();
    return () => controller.abort();
  }, [filePath, owner, repo]);

  if (!filePath) return null;

  return (
    <aside className="fixed bottom-3 right-3 top-3 z-30 w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-white/10 dark:bg-[#121a2e]/95 dark:shadow-black/40">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="break-all text-sm font-semibold text-slate-800 dark:text-slate-100">{filePath}</h3>
        <button type="button" onClick={onClose} aria-label="Close summary" className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-100">&times;</button>
      </div>
      {loading && <div className="space-y-3"><div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-white/10" /><div className="h-3 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-white/10" /><div className="h-3 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></div>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      {!loading && summary && <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{summary}</p>}
    </aside>
  );
}
