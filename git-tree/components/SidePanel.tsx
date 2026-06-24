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

    const cacheKey = `${owner}/${repo}/${filePath}`;
    const cached = getCachedSummary(cacheKey);

    if (cached) {
      setSummary(cached);
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");

    fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, path: filePath }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate summary");
        return res.json();
      })
      .then((data) => {
        setSummary(data.summary);
        setCachedSummary(cacheKey, data.summary);
      })
      .catch(() => setError("Could not generate summary for this file"))
      .finally(() => setLoading(false));
  }, [filePath, owner, repo]);

  if (!filePath) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 border-l border-gray-200 bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="break-all text-sm font-semibold text-gray-800">{filePath}</h3>
        <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-gray-200" />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && summary && (
        <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
      )}
    </div>
  );
}