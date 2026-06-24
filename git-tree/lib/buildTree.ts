import type { GitTreeItem, FileNodeData } from "@/types";
import type { Node, Edge } from "reactflow";

const IGNORED_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".vercel",
];

const IGNORED_EXTENSIONS = [
  "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp",
];

function isIgnored(path: string): boolean {
  const matchesPattern = IGNORED_PATTERNS.some((pattern) => path.includes(pattern));
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const matchesExtension = IGNORED_EXTENSIONS.includes(ext);
  return matchesPattern || matchesExtension;
}

function getExtension(path: string): string {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function buildTreeGraph(
  items: GitTreeItem[],
  maxDepth: number = 4
): { nodes: Node<FileNodeData>[]; edges: Edge[] } {
  const nodes: Node<FileNodeData>[] = [];
  const edges: Edge[] = [];
  const addedPaths = new Set<string>();

  const filtered = items.filter((item) => {
    if (isIgnored(item.path)) return false;
    const depth = item.path.split("/").length;
    return depth <= maxDepth;
  });

  // Sort so parent folders are processed before children
  filtered.sort((a, b) => a.path.split("/").length - b.path.split("/").length);

  let yCounter = 0;
  const levelCounts: Record<number, number> = {};

  filtered.forEach((item) => {
    if (addedPaths.has(item.path)) return;
    addedPaths.add(item.path);

    const segments = item.path.split("/");
    const depth = segments.length;
    const label = segments[segments.length - 1];

    levelCounts[depth] = (levelCounts[depth] || 0) + 1;
    const yPos = depth * 140;
    const xPos = levelCounts[depth] * 200;

    nodes.push({
      id: item.path,
      type: "fileNode",
      position: { x: xPos, y: yPos },
      data: {
        label,
        fullPath: item.path,
        fileType: item.type,
        extension: getExtension(label),
      },
    });

    if (segments.length > 1) {
      const parentPath = segments.slice(0, -1).join("/");
      if (addedPaths.has(parentPath)) {
        edges.push({
          id: `${parentPath}->${item.path}`,
          source: parentPath,
          target: item.path,
          type: "smoothstep",
        });
      }
    }
  });

  return { nodes, edges };
}