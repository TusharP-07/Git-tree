import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchRepoTree, fetchFileContent } from "@/lib/github";
import { extractImports, resolveImportPath } from "@/lib/parseImports";

const SUPPORTED_EXTENSIONS = ["js", "jsx", "ts", "tsx", "py"];
const MAX_FILES_TO_PARSE = 60;

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
    const allPaths = new Set(tree.map((item) => item.path));

    const sourceFiles = tree
      .filter((item) => {
        if (item.type !== "blob") return false;
        const ext = item.path.split(".").pop() || "";
        return SUPPORTED_EXTENSIONS.includes(ext);
      })
      .slice(0, MAX_FILES_TO_PARSE);

    const edges: { source: string; target: string }[] = [];

    await Promise.all(
  sourceFiles.map(async (file) => {
    try {
      const content = await fetchFileContent(owner, repo, file.path, accessToken);
      console.log(`[deps] fetched ${file.path}, length: ${content.length}`); // ADD
      const ext = file.path.split(".").pop() || "";
      const imports = extractImports(content, ext);
      console.log(`[deps] ${file.path} → found ${imports.length} imports:`, imports); // ADD

      imports.forEach((importPath) => {
        const resolved = resolveImportPath(file.path, importPath, allPaths);
        console.log(`[deps] ${file.path} imports "${importPath}" → resolved: ${resolved}`);
        if (resolved) {
          edges.push({ source: file.path, target: resolved });
        }
      });
    } catch (err) {
      console.error(`[deps] FAILED on ${file.path}:`, err); // ADD — was empty before
    }
  })
);

    return NextResponse.json({
      nodes: sourceFiles.map((f) => f.path),
      edges,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze dependencies";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}