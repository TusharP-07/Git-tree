import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText } from "ai";
import { getChatTools } from "@/lib/tools";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPersistentUserIdentifier, getRateLimitIdentifier } from "@/lib/request-identity";
import { isValidRepository } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const MAX_CHAT_MESSAGES = 20;
const MAX_CHAT_REQUEST_BYTES = 16_000;
const MAX_CHAT_OUTPUT_TOKENS = 350;
const MAX_CHAT_STEPS = 3;

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_CHAT_REQUEST_BYTES) {
      return NextResponse.json({ error: "Chat request is too large" }, { status: 413 });
    }

    const { messages, owner, repo } = await req.json();

    if (!owner || !repo || !isValidRepository(owner, repo)) {
      return NextResponse.json({ error: "Invalid repository parameters" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages) || messages.length > MAX_CHAT_MESSAGES) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const session = await auth();
    const accessToken = session?.accessToken;

    const rateLimitKey = getRateLimitIdentifier(req, session?.user);
    const historyUserId = getPersistentUserIdentifier(session?.user);
    const { success, headers } = await checkRateLimit(rateLimitKey);
    
    if (!success) {
      return NextResponse.json(
        { error: "Chat rate limit reached. Please try again later." },
        { status: 429, headers }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI features are not configured" }, { status: 503 });
    }

    const result = streamText({
      model: openai("gpt-6-luna"),
      messages,
      maxOutputTokens: MAX_CHAT_OUTPUT_TOKENS,
      stopWhen: stepCountIs(MAX_CHAT_STEPS),
      providerOptions: {
        openai: {
          reasoningEffort: "none",
          store: false,
        },
      },
      system: `You are an AI coding assistant helping a developer understand the ${owner}/${repo} repository. 
You can use tools to explore the file tree and read file contents to answer their questions.
Always give concise, accurate answers. Do not guess what's inside a file without reading it if you are asked a specific question.`,
      tools: getChatTools(owner, repo, accessToken),
      async onFinish({ text }) {
        if (!supabase) return; // Fail open if supabase is missing
        
        try {
          // Append the AI's final response to the conversation history
          const finalMessages = [
            ...messages,
            { role: "assistant", content: text }
          ];

          await supabase.from("chat_history").insert({
            owner,
            repo,
            user_id: historyUserId,
            messages: finalMessages
          });
        } catch (dbError) {
          console.error("Failed to save chat history:", dbError);
        }
      }
    });

    return (result as unknown as { toDataStreamResponse: () => Response }).toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "An error occurred during chat" }, { status: 500 });
  }
}
