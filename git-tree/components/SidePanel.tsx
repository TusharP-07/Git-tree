"use client";

import { useEffect, useState, useRef } from "react";
import { getCachedSummary, setCachedSummary } from "@/lib/cache";
import { useChat } from "@ai-sdk/react";
import { MessageSquare, FileText, Send, X, Bot, User } from "lucide-react";

interface SidePanelProps {
  filePath: string | null;
  owner: string;
  repo: string;
  onClose: () => void;
  isOpen: boolean;
}

export default function SidePanel({ filePath, owner, repo, onClose, isOpen }: SidePanelProps) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "chat">("chat");
  const [input, setInput] = useState("");

  // @ts-expect-error
  const { messages, sendMessage, status } = useChat({
    // @ts-expect-error
    api: "/api/chat",
    body: { owner, repo },
  });
  
  const chatLoading = status === "streaming" || status === "submitted";

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // @ts-expect-error
    sendMessage({ content: input, role: "user" });
    setInput("");
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  // Handle opening logic
  useEffect(() => {
    if (filePath) setActiveTab("summary");
    else if (isOpen) setActiveTab("chat");
  }, [filePath, isOpen]);

  // Load summary logic
  useEffect(() => {
    if (!filePath || activeTab !== "summary") return;
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
        
        if (controller.signal.aborted) return;

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
  }, [filePath, owner, repo, activeTab]);

  if (!isOpen && !filePath) return null;

  return (
    <aside className="fixed bottom-3 right-3 top-3 z-30 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-white/10 dark:bg-[#121a2e]/95 dark:shadow-black/40">
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("summary")}
            disabled={!filePath}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === "summary" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"} disabled:opacity-50`}
          >
            <FileText size={16} /> Summary
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === "chat" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}
          >
            <MessageSquare size={16} /> Chat
          </button>
        </div>
        <button type="button" onClick={onClose} aria-label="Close panel" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-100">
          <X size={18} />
        </button>
      </div>

      {activeTab === "summary" ? (
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="mb-4 break-all text-sm font-semibold text-slate-800 dark:text-slate-100">{filePath}</h3>
          {loading && <div className="space-y-3"><div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-white/10" /><div className="h-3 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-white/10" /><div className="h-3 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></div>}
          {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          {!loading && summary && <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{summary}</p>}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <Bot size={32} className="mb-3 text-indigo-400" />
                <p className="text-sm">Ask anything about the {repo} repository!</p>
                <p className="mt-2 text-xs opacity-70">I can explore files and explain the code.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`flex flex-col text-sm ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-slate-200'}`}>
                      {/* @ts-expect-error */}
                      {m.content || (
                        <span className="italic opacity-60">
                          {/* @ts-expect-error */}
                          {m.toolInvocations ? "Exploring repository..." : "Thinking..."}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Bot size={16} />
                </div>
                <div className="flex items-center rounded-2xl bg-slate-100 px-4 py-3 dark:bg-white/5">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 p-3 dark:border-white/10">
            <form onSubmit={handleFormSubmit} className="relative flex items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the codebase..."
                className="w-full rounded-full border border-slate-300 bg-white py-2 pl-4 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={chatLoading || !(input || '').trim()}
                className="absolute right-1.5 rounded-full p-1.5 text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-white/10"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
