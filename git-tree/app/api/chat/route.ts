import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { getChatTools } from "@/lib/tools";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { isValidRepository } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages, owner, repo } = await req.json();

    if (!owner || !repo || !isValidRepository(owner, repo)) {
      return NextResponse.json({ error: "Invalid repository parameters" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const session = await auth();
    const accessToken = session?.accessToken;

    const rateLimitKey = session?.user?.email || session?.user?.name || accessToken || req.headers.get("x-forwarded-for") || "anonymous";
    const { success, headers } = await checkRateLimit(rateLimitKey);
    
    if (!success) {
      return NextResponse.json(
        { error: "Chat rate limit reached. Please try again later." },
        { status: 429, headers }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI features are not configured" }, { status: 503 });
    }

    const result = streamText({
      model: google("gemini-1.5-pro"), // Using pro for better reasoning in tool calling, or flash if cost is a concern
      messages,
      system: `You are an AI coding assistant helping a developer understand the ${owner}/${repo} repository. 
You can use tools to explore the file tree and read file contents to answer their questions.
Always give concise, accurate answers. Do not guess what's inside a file without reading it if you are asked a specific question.`,
      tools: getChatTools(owner, repo, accessToken),
      // @ts-ignore
      maxSteps: 6, // tool-calling loop (max 5-6 iterations/turn)
      async onFinish({ text, toolCalls, toolResults, finishReason, usage }) {
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
            user_id: rateLimitKey,
            messages: finalMessages
          });
        } catch (dbError) {
          console.error("Failed to save chat history:", dbError);
        }
      }
    });

    return (result as any).toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "An error occurred during chat" }, { status: 500 });
  }
}
