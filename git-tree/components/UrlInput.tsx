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
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/facebook/react"
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand/90"
        >
          Visualize
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
