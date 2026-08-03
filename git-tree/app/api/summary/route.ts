import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchFileContent } from "@/lib/github";
import { isRateLimited } from "@/lib/rateLimit";
import { isSafeRepositoryPath, isValidRepository } from "@/lib/validation";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

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

    const rateLimitKey = session.user?.email || session.user?.name || accessToken;
    if (isRateLimited(rateLimitKey, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Summary limit reached. Please try again in an hour." },
        { status: 429 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
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

    const geminiRes = await fetch(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 250, temperature: 0.3 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: "AI summary generation failed" },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const summary =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Could not generate a summary for this file.";

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
