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
  const [graphs, setGraphs] = useState<Partial<Record<"tree" | "dependency", { nodes: Node<FileNodeData>[]; edges: Edge[]; notice: string }>>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadGraph() {
      const cachedGraph = graphs[mode];
      if (cachedGraph) {
        setNodes(cachedGraph.nodes);
        setEdges(cachedGraph.edges);
        setNotice(cachedGraph.notice);
        setError("");
        setLoading(false);
        return;
      }

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
          const treeNotice = truncated ? "GitHub returned a partial file tree because this repository is very large." : "";
          setNotice(treeNotice);
          setGraphs((current) => ({ ...current, tree: { ...graph, notice: treeNotice } }));
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
        const dependencyNotice = dependencyData.treeTruncated || dependencyData.analyzedFiles < dependencyData.totalSourceFiles
          ? `This dependency view analyzes ${dependencyData.analyzedFiles} of ${dependencyData.totalSourceFiles} source files and may be incomplete.`
          : "";
        setNotice(dependencyNotice);
        setGraphs((current) => ({ ...current, dependency: { ...graph, notice: dependencyNotice } }));
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Could not load this repository");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadGraph();
    return () => controller.abort();
  }, [owner, repo, mode, graphs]);

  const handleNodeClick = useCallback((path: string) => {
    setSelectedFile(path);
    setIsPanelOpen(true);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-[#090b14]">
      <Navbar />
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/60 px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10 dark:bg-[#0c1120]/70">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Repository graph</p>
          <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{owner}/{repo}</h2>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle mode={mode} onChange={setMode} />
          <button 
            onClick={() => setIsPanelOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Chat with AI
          </button>
        </div>
      </div>
      <div className="relative flex-1 p-3 sm:p-5">
        {loading && <LoadingSpinner text={`Loading ${mode} view...`} />}
        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {notice && <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">{notice}</p>}
        {!loading && !error && <GraphCanvas key={`${mode}:${owner}:${repo}:${nodes.length}:${edges.length}`} nodes={nodes} edges={edges} mode={mode} onNodeClick={handleNodeClick} />}
        
        <SidePanel 
          filePath={selectedFile} 
          owner={owner} 
          repo={repo} 
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)} 
        />
      </div>
    </div>
  );
}
