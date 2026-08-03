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

interface GraphCanvasProps {
  nodes: Node<FileNodeData>[];
  edges: Edge[];
  onNodeClick: (path: string) => void;
}

const nodeTypes = { fileNode: FileNode };
const REVEAL_STEP_MS = 80; // delay between each depth level appearing

export default function GraphCanvas({ nodes, edges, onNodeClick }: GraphCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  // Group nodes by depth (y position) so whole "levels" appear together
  const sortedByDepth = useMemo(() => {
    return [...nodes].sort((a, b) => a.position.y - b.position.y);
  }, [nodes]);

  const depthLevels = useMemo(() => {
    const levels: number[] = [];
    sortedByDepth.forEach((n) => {
      if (!levels.includes(n.position.y)) levels.push(n.position.y);
    });
    return levels;
  }, [sortedByDepth]);

  useEffect(() => {
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
      edges
        .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        .map((e) => ({ ...e, className: "animate-edge-in" })),
    [edges, visibleNodeIds]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FileNodeData>) => {
      if (node.data.fileType !== "blob") return;
      setSelectedId(node.id);
      onNodeClick(node.data.fullPath);
    },
    [onNodeClick]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={animatedNodes}
        edges={animatedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
