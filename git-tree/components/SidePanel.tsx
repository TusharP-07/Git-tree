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
    <aside className="fixed right-0 top-0 h-full w-80 border-l border-gray-200 bg-white p-5 shadow-lg dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="break-all text-sm font-semibold text-gray-800 dark:text-gray-100">{filePath}</h3>
        <button type="button" onClick={onClose} aria-label="Close summary" className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
      </div>
      {loading && <div className="space-y-2"><div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" /><div className="h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800" /><div className="h-3 w-4/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800" /></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && summary && <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{summary}</p>}
    </aside>
  );
}
