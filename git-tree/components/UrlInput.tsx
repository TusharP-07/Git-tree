"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseGitHubUrl } from "@/lib/github";

export default function UrlInput() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseGitHubUrl(url);

    if (!parsed) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setError("");
    router.push(`/graph/${parsed.owner}/${parsed.repo}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl text-left">
      <label htmlFor="repository-url" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">GitHub repository URL</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="repository-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/facebook/react"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
        />
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/35 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
        >
          Visualize
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </form>
  );
}
