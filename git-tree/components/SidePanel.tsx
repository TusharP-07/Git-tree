"use client";

import { useEffect, useState, useRef } from "react";
import { getCachedSummary, setCachedSummary } from "@/lib/cache";
import { useChat } from "@ai-sdk/react";
import { signIn } from "next-auth/react";
import FadeContent from "@/components/FadeContent";
import { MessageSquare, FileText, Send, X, Bot, User, Sparkles } from "lucide-react";

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
  const [needsGitHubLogin, setNeedsGitHubLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "chat">("chat");
  const [input, setInput] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const { messages, sendMessage, status, error: chatError } = useChat({
    // @ts-expect-error type mismatch
    api: "/api/chat",
    body: { owner, repo },
  });
  
  const chatLoading = status === "streaming" || status === "submitted";

  const closePanel = () => {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // @ts-expect-error type mismatch
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

  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

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
      setNeedsGitHubLogin(false);
      setSummary("");
      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, path: filePath }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.status === 401) setNeedsGitHubLogin(true);
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

  if (!isOpen) return null;

  return (
    <FadeContent
      trigger="mount"
      effect="focus"
      blur={6}
      duration={0.42}
      ease="power3.out"
      className={`fixed bottom-3 right-3 top-3 z-30 w-[min(24rem,calc(100vw-1.5rem))] transition-all duration-200 ${isClosing ? "translate-x-5 scale-[0.98] opacity-0" : "translate-x-0 scale-100 opacity-100"}`}
    >
      <aside className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-white/10 dark:bg-[#121a2e]/95 dark:shadow-black/40">
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/15" />
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("summary")}
            disabled={!filePath}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${activeTab === "summary" ? "bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"} disabled:opacity-50`}
          >
            <FileText size={16} /> Summary
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${activeTab === "chat" ? "bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}
          >
            <MessageSquare size={16} /> Chat
          </button>
        </div>
        <button type="button" onClick={closePanel} aria-label="Close panel" className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:rotate-90 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-100">
          <X size={18} />
        </button>
      </div>

      {activeTab === "summary" ? (
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="mb-4 break-all text-sm font-semibold text-slate-800 dark:text-slate-100">{filePath}</h3>
          {loading && <div className="space-y-3"><div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-white/10" /><div className="h-3 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-white/10" /><div className="h-3 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></div>}
          {error && (
            <div className="space-y-3">
              <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
              {needsGitHubLogin && (
                <button
                  type="button"
                  onClick={() => signIn("github")}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Sign in with GitHub
                </button>
              )}
            </div>
          )}
          {!loading && summary && <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{summary}</p>}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                {chatError.message || "Chat could not complete. Please try again."}
              </p>
            )}
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm ring-1 ring-indigo-200/70 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20">
                  <Sparkles size={22} />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Ask anything about {repo}</p>
                <p className="mt-2 max-w-56 text-xs leading-relaxed opacity-70">I can inspect files, trace code paths, and explain how the project fits together.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`animate-in fade-in slide-in-from-bottom-2 flex gap-3 duration-300 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`flex flex-col text-sm ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-4 py-2 leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-indigo-500/15' : 'bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-slate-200'}`}>
                      {/* @ts-expect-error type mismatch */}
                      {m.content || (
                        <span className="italic opacity-60">
                          {/* @ts-expect-error type mismatch */}
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
                <div className="flex items-center rounded-2xl bg-slate-100 px-4 py-3 shadow-sm dark:bg-white/5">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 bg-white/60 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-[#121a2e]/60">
            <form onSubmit={handleFormSubmit} className="relative flex items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the codebase..."
                className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-4 pr-11 text-sm shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={chatLoading || !(input || '').trim()}
                className="absolute right-1.5 rounded-full p-2 text-indigo-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-sm active:scale-90 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-white/10"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
      </aside>
    </FadeContent>
  );
}
