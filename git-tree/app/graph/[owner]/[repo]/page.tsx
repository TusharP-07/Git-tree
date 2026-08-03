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
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-[#090b14]">
      <Navbar />
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/60 px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10 dark:bg-[#0c1120]/70">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Repository graph</p>
          <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{owner}/{repo}</h2>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <div className="relative flex-1 p-3 sm:p-5">
        {loading && <LoadingSpinner text={`Loading ${mode} view...`} />}
        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {notice && <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">{notice}</p>}
        {!loading && !error && <GraphCanvas key={`${mode}:${owner}:${repo}:${nodes.length}:${edges.length}`} nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />}
        <SidePanel filePath={selectedFile} owner={owner} repo={repo} onClose={() => setSelectedFile(null)} />
      </div>
    </div>
  );
}
