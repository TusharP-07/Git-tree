"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Edge, Node } from "reactflow";
import GraphCanvas from "@/components/GraphCanvas";
import LoadingSpinner from "@/components/LoadingSpinner";
import ModeToggle from "@/components/ModeToggle";
import Navbar from "@/components/Navbar";
import SidePanel from "@/components/SidePanel";
import { buildTreeGraph } from "@/lib/buildTree";
import { layoutGraph } from "@/lib/layoutGraph";
import type { FileNodeData, GitTreeItem } from "@/types";

interface TreeResponse {
  tree: GitTreeItem[];
  truncated: boolean;
}

interface DependencyResponse {
  nodes: string[];
  edges: { source: string; target: string }[];
  treeTruncated: boolean;
  totalSourceFiles: number;
  analyzedFiles: number;
}

export default function GraphPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [mode, setMode] = useState<"tree" | "dependency">("tree");
  const [nodes, setNodes] = useState<Node<FileNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadGraph() {
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const query = new URLSearchParams({ owner, repo });
        const response = await fetch(mode === "tree" ? `/api/tree?${query}` : `/api/deps?${query}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load this repository");

        if (mode === "tree") {
          const { tree, truncated } = data as TreeResponse;
          const graph = buildTreeGraph(tree);
          setNodes(graph.nodes);
          setEdges(graph.edges);
          if (truncated) setNotice("GitHub returned a partial file tree because this repository is very large.");
          return;
        }

        const dependencyData = data as DependencyResponse;
        const dependencyNodes: Node<FileNodeData>[] = dependencyData.nodes.map((path) => {
          const label = path.split("/").pop() || path;
          const extension = label.includes(".") ? label.split(".").pop()! : "";
          return { id: path, type: "fileNode", position: { x: 0, y: 0 }, data: { label, fullPath: path, fileType: "blob", extension } };
        });
        const dependencyEdges: Edge[] = dependencyData.edges.map((edge) => ({
          id: `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: true,
        }));
        const graph = layoutGraph(dependencyNodes, dependencyEdges, "TB");
        setNodes(graph.nodes);
        setEdges(graph.edges);
        if (dependencyData.treeTruncated || dependencyData.analyzedFiles < dependencyData.totalSourceFiles) {
          setNotice(`This dependency view analyzes ${dependencyData.analyzedFiles} of ${dependencyData.totalSourceFiles} source files and may be incomplete.`);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Could not load this repository");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadGraph();
    return () => controller.abort();
  }, [owner, repo, mode]);

  const handleNodeClick = useCallback((path: string) => setSelectedFile(path), []);

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">{owner}/{repo}</h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <div className="relative flex-1">
        {loading && <LoadingSpinner text={`Loading ${mode} view...`} />}
        {error && <p className="p-6 text-sm text-red-600">{error}</p>}
        {notice && <p className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">{notice}</p>}
        {!loading && !error && <GraphCanvas key={`${mode}:${owner}:${repo}:${nodes.length}:${edges.length}`} nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />}
        <SidePanel filePath={selectedFile} owner={owner} repo={repo} onClose={() => setSelectedFile(null)} />
      </div>
    </div>
  );
}
