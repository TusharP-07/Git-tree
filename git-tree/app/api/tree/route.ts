import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchRepoTree } from "@/lib/github";
import { isValidRepository } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitIdentifier } from "@/lib/request-identity";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo || !isValidRepository(owner, repo)) {
    return NextResponse.json(
      { error: "Missing owner or repo parameter" },
      { status: 400 }
    );
  }

  try {
    const session = await auth();
    const accessToken = session?.accessToken;
    const { success, headers } = await checkRateLimit(
      getRateLimitIdentifier(request, session?.user)
    );

    if (!success) {
      return NextResponse.json(
        { error: "Repository request limit reached. Please try again later." },
        { status: 429, headers }
      );
    }

    const { tree, truncated } = await fetchRepoTree(owner, repo, accessToken);
    return NextResponse.json({ tree, truncated });
  } catch (err) {
    console.error("[tree] error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch repository";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
