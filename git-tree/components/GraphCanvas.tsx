"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import FileNode from "./FileNode";
import type { FileNodeData } from "@/types";
import { layoutGraph } from "@/lib/layoutGraph";

interface GraphCanvasProps {
  nodes: Node<FileNodeData>[];
  edges: Edge[];
  mode: "tree" | "dependency";
  onNodeClick: (path: string) => void;
}

const nodeTypes = { fileNode: FileNode };
const REVEAL_STEP_MS = 80; // delay between each depth level appearing

export default function GraphCanvas({ nodes, edges, mode, onNodeClick }: GraphCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const isTreeView = mode === "tree";

  const folderIds = useMemo(
    () => nodes.filter((node) => node.data.fileType === "tree").map((node) => node.id),
    [nodes]
  );

  const visibleTreeNodes = useMemo(() => {
    if (!isTreeView) return nodes;

    return nodes.filter((node) => {
      const ancestors = node.id.split("/").slice(0, -1);
      return ancestors.every((_, index) => expandedFolders.has(ancestors.slice(0, index + 1).join("/")));
    });
  }, [nodes, expandedFolders, isTreeView]);

  const visibleTreeNodeIds = useMemo(() => new Set(visibleTreeNodes.map((node) => node.id)), [visibleTreeNodes]);

  const laidOutGraph = useMemo(() => {
    const visibleEdges = edges.filter((edge) => visibleTreeNodeIds.has(edge.source) && visibleTreeNodeIds.has(edge.target));
    return layoutGraph(visibleTreeNodes, visibleEdges, "TB");
  }, [edges, visibleTreeNodeIds, visibleTreeNodes]);

  const displayedNodes = useMemo(
    () => laidOutGraph.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        expanded: isTreeView && expandedFolders.has(node.id),
      },
    })),
    [expandedFolders, isTreeView, laidOutGraph.nodes]
  );

  // Group nodes by depth (y position) so whole "levels" appear together
  const sortedByDepth = useMemo(() => {
    return [...displayedNodes].sort((a, b) => a.position.y - b.position.y);
  }, [displayedNodes]);

  const depthLevels = useMemo(() => {
    const levels: number[] = [];
    sortedByDepth.forEach((n) => {
      if (!levels.includes(n.position.y)) levels.push(n.position.y);
    });
    return levels;
  }, [sortedByDepth]);

  useEffect(() => {
    setVisibleCount(0);
    if (depthLevels.length === 0) return;

    let level = 0;
    const interval = setInterval(() => {
      level += 1;
      setVisibleCount(level);
      if (level >= depthLevels.length) clearInterval(interval);
    }, REVEAL_STEP_MS);

    return () => clearInterval(interval);
  }, [depthLevels]);

  const visibleDepths = useMemo(
    () => new Set(depthLevels.slice(0, visibleCount)),
    [depthLevels, visibleCount]
  );

  const animatedNodes = useMemo(
    () =>
      sortedByDepth
        .filter((n) => visibleDepths.has(n.position.y))
        .map((n) => ({
          ...n,
          style: {
            ...(n.id === selectedId ? { outline: "2px solid #4F46E5" } : {}),
            opacity: 1,
            transition: "opacity 0.4s ease, transform 0.4s ease",
          },
          className: "animate-node-in",
        })),
    [sortedByDepth, visibleDepths, selectedId]
  );

  const visibleNodeIds = useMemo(
    () => new Set(animatedNodes.map((n) => n.id)),
    [animatedNodes]
  );

  const animatedEdges = useMemo(
    () =>
      laidOutGraph.edges
        .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        .map((e) => ({ ...e, className: "animate-edge-in" })),
    [laidOutGraph.edges, visibleNodeIds]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FileNodeData>) => {
      if (isTreeView && node.data.fileType === "tree") {
        setExpandedFolders((current) => {
          const next = new Set(current);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          return next;
        });
        return;
      }
      setSelectedId(node.id);
      onNodeClick(node.data.fullPath);
    },
    [isTreeView, onNodeClick]
  );

  const expandAll = useCallback(() => setExpandedFolders(new Set(folderIds)), [folderIds]);
  const collapseAll = useCallback(() => setExpandedFolders(new Set()), []);

  return (
    <div className="graph-surface h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-[#11172a] dark:shadow-black/30">
      <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{isTreeView ? "Folder-first view" : "Dependency view"}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isTreeView
                ? `Click a folder to show or hide its contents · ${visibleTreeNodes.length} of ${nodes.length} items visible`
                : `${nodes.length} analyzed files · lines show detected imports`}
            </p>
          </div>
          {isTreeView && (
            <div className="flex gap-1.5">
              <button type="button" onClick={expandAll} className="rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500">Expand all</button>
              <button type="button" onClick={collapseAll} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10">Collapse all</button>
            </div>
          )}
        </div>
      </div>
      <ReactFlow
        nodes={animatedNodes}
        edges={animatedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.1}
      >
        <Background color="var(--graph-grid)" gap={20} size={1} />
        <Controls />
        <MiniMap maskColor="var(--graph-minimap-mask)" />
      </ReactFlow>
    </div>
  );
}
