import type { DataFlow } from "@/types";

const has = (content: string, pattern: RegExp) => pattern.test(content);

export function inferDataFlow(source: string, target: string, content: string): DataFlow {
  const context = `${source}\n${target}\n${content}`;

  if (has(context, /\bstreamText\b|\bopenai\b|\banthropic\b|\bgemini\b/i)) {
    return {
      transport: "ai",
      format: "messages → streamed text",
      detail: "Likely sends prompt or chat-message data and receives generated text as a stream.",
      confidence: "inferred",
    };
  }

  if (has(context, /\bsupabase\b|\.from\([^)]*\)\.(?:insert|select|update|delete)/i)) {
    return {
      transport: "database",
      format: "record / JSON row",
      detail: "Likely reads or writes structured database records through a data client.",
      confidence: "inferred",
    };
  }

  if (has(context, /\bredis\b|\bratelimit\b|\bcach(?:e|ing)\b/i)) {
    return {
      transport: "cache",
      format: "key → cached value",
      detail: "Likely exchanges a cache key, rate-limit identifier, or short-lived cached value.",
      confidence: "inferred",
    };
  }

  if (has(context, /\bauth\(|\bnextauth\b|\bsession\b|\baccessToken\b|\boauth\b/i)) {
    return {
      transport: "auth",
      format: "session / access token",
      detail: "Likely passes authenticated-session context or an access token for an upstream request.",
      confidence: "inferred",
    };
  }

  if (has(content, /\bfetch\(|\bNextResponse\.json\b|\bJSON\.(?:parse|stringify)\b/i)) {
    return {
      transport: "http",
      format: "JSON request / response",
      detail: "Likely exchanges serialized request parameters or a JSON response across an HTTP boundary.",
      confidence: "inferred",
    };
  }

  return {
    transport: "module",
    format: "function arguments / exports",
    detail: "This is a static module dependency; the exact runtime values require execution tracing.",
    confidence: "inferred",
  };
}
