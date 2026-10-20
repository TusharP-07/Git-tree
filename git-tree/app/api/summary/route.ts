import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchFileContent } from "@/lib/github";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitIdentifier } from "@/lib/request-identity";
import { isSafeRepositoryPath, isValidRepository } from "@/lib/validation";

const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_SUMMARY_MODEL = "gpt-6-luna";

const MAX_CONTENT_CHARS = 8000; // keep prompt small — cost & latency control

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, path } = await request.json();

    if (
      typeof owner !== "string" ||
      typeof repo !== "string" ||
      typeof path !== "string" ||
      !isValidRepository(owner, repo) ||
      !isSafeRepositoryPath(path)
    ) {
      return NextResponse.json(
        { error: "Missing owner, repo, or path" },
        { status: 400 }
      );
    }

    const session = await auth();
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: "Sign in to generate AI summaries" }, { status: 401 });
    }

    const rateLimitKey = getRateLimitIdentifier(request, session.user);
    const { success, headers } = await checkRateLimit(rateLimitKey);
    
    if (!success) {
      return NextResponse.json(
        { error: "Summary limit reached. Please try again later." },
        { status: 429, headers }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI summaries are not configured" }, { status: 503 });
    }

    const content = await fetchFileContent(owner, repo, path, accessToken);
    const truncated = content.slice(0, MAX_CONTENT_CHARS);

    const prompt = `You are analyzing a source file from a GitHub repository.
File path: ${path}

Summarize in 3 concise sentences:
1. What this file's primary purpose is
2. Its main exports, functions, or classes
3. Its likely role in the broader project

File content:
${truncated}`;

    const openAiRes = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_SUMMARY_MODEL,
        input: prompt,
        max_output_tokens: 200,
        reasoning: { effort: "none" },
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      console.error("OpenAI API error:", errText);
      return NextResponse.json(
        { error: "AI summary generation failed" },
        { status: 502 }
      );
    }

    const data = await openAiRes.json();
    const summary =
      data.output
        ?.filter((item: { type?: string }) => item.type === "message")
        .flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content ?? [])
        .filter((content: { type?: string }) => content.type === "output_text")
        .map((content: { text?: string }) => content.text ?? "")
        .join("")
        .trim() || "Could not generate a summary for this file.";

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
