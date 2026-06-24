"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Node, Edge } from "reactflow";
import Navbar from "@/components/Navbar";
import GraphCanvas from "@/components/GraphCanvas";
import SidePanel from "@/components/SidePanel";
import ModeToggle from "@/components/ModeToggle";
import LoadingSpinner from "@/components/LoadingSpinner";
import { buildTreeGraph } from "@/lib/buildTree";
import { layoutGraph } from "@/lib/layoutGraph";
import type { FileNodeData, GitTreeItem } from "@/types";

export default function GraphPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const { owner, repo } = params;

  const [mode, setMode] = useState<"tree" | "dependency">("tree");
  const [nodes, setNodes] = useState<Node<FileNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "tree") return;

    setLoading(true);
    setError("");

    fetch(`/api/tree?owner=${owner}&repo=${repo}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch repository tree");
        return res.json();
      })
      .then((data: { tree: GitTreeItem[] }) => {
        const { nodes: treeNodes, edges: treeEdges } = buildTreeGraph(data.tree);
        setNodes(treeNodes);
        setEdges(treeEdges);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [owner, repo, mode]);

  useEffect(() => {
    if (mode !== "dependency") return;

    setLoading(true);
    setError("");

    fetch(`/api/deps?owner=${owner}&repo=${repo}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to analyze dependencies");
        return res.json();
      })
      .then((data: { nodes: string[]; edges: { source: string; target: string }[] }) => {
        const depNodes: Node<FileNodeData>[] = data.nodes.map((path) => {
          const label = path.split("/").pop() || path;
          const extension = label.includes(".") ? label.split(".").pop()! : "";
          return {
            id: path,
            type: "fileNode",
            position: { x: 0, y: 0 },
            data: { label, fullPath: path, fileType: "blob", extension },
          };
        });

        const depEdges: Edge[] = data.edges.map((e) => ({
          id: `${e.source}->${e.target}`,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: true,
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = layoutGraph(
          depNodes,
          depEdges,
          "TB"
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [owner, repo, mode]);

  const handleNodeClick = useCallback((path: string) => {
    setSelectedFile(path);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <h2 className="text-sm font-medium text-gray-700">
          {owner}/{repo}
        </h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <div className="relative flex-1">
        {loading && <LoadingSpinner text={`Loading ${mode} view...`} />}
        {error && <p className="p-6 text-sm text-red-600">{error}</p>}
        {!loading && !error && (
          <GraphCanvas nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
        )}

        <SidePanel
          filePath={selectedFile}
          owner={owner}
          repo={repo}
          onClose={() => setSelectedFile(null)}
        />
      </div>
    </div>
  );
}