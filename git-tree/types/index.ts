export interface GitTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface FileNodeData {
  label: string;
  fullPath: string;
  fileType: "blob" | "tree";
  extension: string;
  childCount?: number;
  expanded?: boolean;
  feature?: import("@/lib/dependencyFeatures").DependencyFeature;
}

export interface SummaryResponse {
  summary: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
}
