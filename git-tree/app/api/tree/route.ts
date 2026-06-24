import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchRepoTree } from "@/lib/github";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Missing owner or repo parameter" },
      { status: 400 }
    );
  }

  try {
    const session = await auth();
    const accessToken = session?.accessToken;

    const tree = await fetchRepoTree(owner, repo, accessToken);
    return NextResponse.json({ tree });
  } catch (err) {
  console.error("[tree] error:", err); // ADD THIS
  const message = err instanceof Error ? err.message : "Failed to fetch repository";
  return NextResponse.json({ error: message }, { status: 502 });
}
}