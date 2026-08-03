const JS_IMPORT_REGEX = /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["'])|(?:export\s+.*?\s+from\s+["']([^"']+)["'])|(?:require\s*\(\s*["']([^"']+)["']\s*\))|(?:import\s*\(\s*["']([^"']+)["']\s*\))/g;
const PY_IMPORT_REGEX = /^(?:from\s+(\.*[\w.]+)\s+import|import\s+([\w.]+))/gm;

export function extractImports(content: string, extension: string): string[] {
  const imports = new Set<string>();

  if (["js", "jsx", "ts", "tsx"].includes(extension)) {
    for (const match of content.matchAll(JS_IMPORT_REGEX)) {
      const importPath = match[1] || match[2] || match[3] || match[4];
      if (importPath?.startsWith(".")) imports.add(importPath);
    }
  } else if (extension === "py") {
    for (const match of content.matchAll(PY_IMPORT_REGEX)) {
      const importPath = match[1] || match[2];
      if (importPath) imports.add(importPath);
    }
  }

  return [...imports];
}

export function resolveImportPath(
  importerPath: string,
  importPath: string,
  allPaths: Set<string>,
  isPython = false
): string | null {
  const importerDir = importerPath.split("/").slice(0, -1);
  let resolvedSegments: string[];
  let targetSegments: string[];

  if (isPython) {
    const leadingDots = importPath.match(/^\.+/)?.[0].length ?? 0;
    const moduleSegments = importPath.slice(leadingDots).split(".").filter(Boolean);
    resolvedSegments = leadingDots > 0 ? [...importerDir] : [];
    for (let index = 1; index < leadingDots; index += 1) resolvedSegments.pop();
    targetSegments = moduleSegments;
  } else {
    resolvedSegments = [...importerDir];
    targetSegments = importPath.split("/");
  }

  for (const segment of targetSegments) {
    if (segment === "..") resolvedSegments.pop();
    else if (segment !== "." && segment) resolvedSegments.push(segment);
  }

  const base = resolvedSegments.join("/");
  const candidates = isPython
    ? [base, `${base}.py`, `${base}/__init__.py`]
    : [base, `${base}.js`, `${base}.ts`, `${base}.jsx`, `${base}.tsx`, `${base}.py`, `${base}/index.js`, `${base}/index.ts`, `${base}/index.tsx`];

  return candidates.find((candidate) => allPaths.has(candidate)) || null;
}
