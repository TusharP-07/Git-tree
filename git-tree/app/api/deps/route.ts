import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchFileContent, fetchRepoTree } from "@/lib/github";
import { extractImports, resolveImportPath } from "@/lib/parseImports";
import { isValidRepository } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

const SUPPORTED_EXTENSIONS = ["js", "jsx", "ts", "tsx", "py"];
const MAX_FILES_TO_PARSE = 60;
const MAX_PUBLIC_FILES_TO_PARSE = 60;
const CONTENT_FETCH_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo || !isValidRepository(owner, repo)) {
    return NextResponse.json({ error: "Missing or invalid owner or repo parameter" }, { status: 400 });
  }

  try {
    const session = await auth();
    const accessToken = session?.accessToken;

    const rateLimitKey = session?.user?.email || session?.user?.name || accessToken || request.headers.get("x-forwarded-for") || "anonymous";
    const { success, headers } = await checkRateLimit(rateLimitKey);
    
    if (!success) {
      return NextResponse.json(
        { error: "Dependency analysis limit reached. Please try again later." },
        { status: 429, headers }
      );
    }

    const { tree, truncated: treeTruncated } = await fetchRepoTree(owner, repo, accessToken);
    const allPaths = new Set(tree.map((item) => item.path));
    const allSourceFiles = tree.filter((item) => {
      if (item.type !== "blob") return false;
      const extension = item.path.split(".").pop()?.toLowerCase() || "";
      return SUPPORTED_EXTENSIONS.includes(extension);
    });
    // Keep the dependency view consistent for public and signed-in repositories.
    const fileLimit = accessToken ? MAX_FILES_TO_PARSE : MAX_PUBLIC_FILES_TO_PARSE;
    const sourceFiles = allSourceFiles.slice(0, fileLimit);

    const edgeLists = await mapWithConcurrency(
      sourceFiles,
      CONTENT_FETCH_CONCURRENCY,
      async (file) => {
        try {
          const content = await fetchFileContent(owner, repo, file.path, accessToken);
          const extension = file.path.split(".").pop()?.toLowerCase() || "";
          return extractImports(content, extension)
            .map((importPath) => resolveImportPath(file.path, importPath, allPaths, extension === "py"))
            .filter((target): target is string => target !== null)
            .map((target) => ({ source: file.path, target }));
        } catch {
          return [];
        }
      }
    );

    const edges = [...new Map(edgeLists.flat().map((edge) => [`${edge.source}->${edge.target}`, edge])).values()];

    return NextResponse.json({
      nodes: sourceFiles.map((file) => file.path),
      edges,
      treeTruncated,
      totalSourceFiles: allSourceFiles.length,
      analyzedFiles: sourceFiles.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze dependencies";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
