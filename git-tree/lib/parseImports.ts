// Extracts import/require statements from JS/TS and Python source files.
// Regex-based — fast, no AST dependency, good enough for visualization purposes.

const JS_IMPORT_REGEX = /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;
const PY_IMPORT_REGEX = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm;

export function extractImports(content: string, extension: string): string[] {
  const imports: string[] = [];

  if (["js", "jsx", "ts", "tsx"].includes(extension)) {
    let match;
    while ((match = JS_IMPORT_REGEX.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath && importPath.startsWith(".")) {
        imports.push(importPath);
      }
    }
  } else if (extension === "py") {
    let match;
    while ((match = PY_IMPORT_REGEX.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath) {
        imports.push(importPath.replace(/\./g, "/"));
      }
    }
  }

  return imports;
}

// Resolves a relative import path against the importing file's directory
// to produce a path that matches entries in the GitHub tree.
export function resolveImportPath(
  importerPath: string,
  importPath: string,
  allPaths: Set<string>
): string | null {
  const importerDir = importerPath.split("/").slice(0, -1).join("/");
  const segments = importPath.split("/");
  const resolvedSegments = importerDir ? importerDir.split("/") : [];

  for (const segment of segments) {
    if (segment === "..") {
      resolvedSegments.pop();
    } else if (segment !== ".") {
      resolvedSegments.push(segment);
    }
  }

  const base = resolvedSegments.join("/");
  const candidates = [
    base,
    `${base}.js`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.tsx`,
    `${base}.py`,
    `${base}/index.js`,
    `${base}/index.ts`,
  ];

  return candidates.find((candidate) => allPaths.has(candidate)) || null;
}