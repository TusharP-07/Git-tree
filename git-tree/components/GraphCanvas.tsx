"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { Maximize2, Move, RotateCcw, SlidersHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import FileNode from "./FileNode";
import type { DataFlow, FileNodeData } from "@/types";
import { layoutGraph } from "@/lib/layoutGraph";
import { dependencyFeatureLabels, type DependencyFeature } from "@/lib/dependencyFeatures";

interface GraphCanvasProps {
  nodes: Node<FileNodeData>[];
  edges: Edge[];
  mode: "tree" | "dependency";
  onNodeClick: (path: string) => void;
  activeFeature?: DependencyFeature | "all";
  onFeatureChange?: (feature: DependencyFeature | "all") => void;
}

const nodeTypes = { fileNode: FileNode };
const REVEAL_STEP_MS = 80; // delay between each depth level appearing

export default function GraphCanvas({ nodes, edges, mode, onNodeClick, activeFeature = "all", onFeatureChange }: GraphCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hiddenExtensions, setHiddenExtensions] = useState<Set<string>>(new Set());
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedFlow, setSelectedFlow] = useState<DataFlow | null>(null);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const pendingPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const positionFrameRef = useRef<number | null>(null);
  const isTreeView = mode === "tree";

  const fileExtensions = useMemo(
    () => Array.from(new Set(nodes.filter((node) => node.data.fileType === "blob").map((node) => node.data.extension || "[no extension]"))).sort(),
    [nodes]
  );

  const filteredNodes = useMemo(() => {
    if (!isTreeView) return activeFeature === "all" ? nodes : nodes.filter((node) => node.data.feature === activeFeature);
    if (hiddenExtensions.size === 0) return nodes;

    const visibleFileIds = nodes
      .filter((node) => node.data.fileType === "blob" && !hiddenExtensions.has(node.data.extension || "[no extension]"))
      .map((node) => node.id);
    const visibleFolderIds = new Set<string>();

    visibleFileIds.forEach((path) => {
      const segments = path.split("/");
      for (let index = 1; index < segments.length; index += 1) {
        visibleFolderIds.add(segments.slice(0, index).join("/"));
      }
    });

    return nodes.filter(
      (node) =>
        node.data.fileType === "blob"
          ? !hiddenExtensions.has(node.data.extension || "[no extension]")
          : visibleFolderIds.has(node.id)
    );
  }, [activeFeature, hiddenExtensions, isTreeView, nodes]);

  const folderIds = useMemo(
    () => nodes.filter((node) => node.data.fileType === "tree").map((node) => node.id),
    [nodes]
  );

  const visibleTreeNodes = useMemo(() => {
    if (!isTreeView) return filteredNodes;

    return filteredNodes.filter((node) => {
      const ancestors = node.id.split("/").slice(0, -1);
      return ancestors.every((_, index) => expandedFolders.has(ancestors.slice(0, index + 1).join("/")));
    });
  }, [filteredNodes, expandedFolders, isTreeView]);

  const visibleTreeNodeIds = useMemo(() => new Set(visibleTreeNodes.map((node) => node.id)), [visibleTreeNodes]);

  const laidOutGraph = useMemo(() => {
    const visibleEdges = edges.filter((edge) => visibleTreeNodeIds.has(edge.source) && visibleTreeNodeIds.has(edge.target));
    return layoutGraph(visibleTreeNodes, visibleEdges, "TB");
  }, [edges, visibleTreeNodeIds, visibleTreeNodes]);

  const displayedNodes = useMemo(
    () => laidOutGraph.nodes.map((node) => ({
      ...node,
      position: manualPositions[node.id] ?? node.position,
      data: {
        ...node.data,
        expanded: isTreeView && expandedFolders.has(node.id),
      },
    })),
    [expandedFolders, isTreeView, laidOutGraph.nodes, manualPositions]
  );

  const layoutYByNodeId = useMemo(
    () => new Map(laidOutGraph.nodes.map((node) => [node.id, node.position.y])),
    [laidOutGraph.nodes]
  );

  // Keep the entrance animation tied to the generated layout, not a dragged position.
  const sortedByDepth = useMemo(() => {
    return [...displayedNodes].sort((a, b) => (layoutYByNodeId.get(a.id) ?? 0) - (layoutYByNodeId.get(b.id) ?? 0));
  }, [displayedNodes, layoutYByNodeId]);

  const depthLevels = useMemo(() => {
    const levels: number[] = [];
    sortedByDepth.forEach((n) => {
      const layoutY = layoutYByNodeId.get(n.id) ?? 0;
      if (!levels.includes(layoutY)) levels.push(layoutY);
    });
    return levels;
  }, [layoutYByNodeId, sortedByDepth]);

  useEffect(() => {
    if (depthLevels.length === 0) return;

    let level = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setVisibleCount(0);
      interval = setInterval(() => {
        level += 1;
        setVisibleCount(level);
        if (level >= depthLevels.length && interval) clearInterval(interval);
      }, REVEAL_STEP_MS);
    }, 0);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [depthLevels]);

  const visibleDepths = useMemo(
    () => new Set(depthLevels.slice(0, visibleCount)),
    [depthLevels, visibleCount]
  );

  const animatedNodes = useMemo(
    () =>
      sortedByDepth
        .filter((n) => visibleDepths.has(layoutYByNodeId.get(n.id) ?? 0))
        .map((n) => ({
          ...n,
          style: {
            ...(n.id === selectedId ? { outline: "2px solid #4F46E5" } : {}),
            opacity: 1,
            transition: "opacity 0.4s ease, transform 0.4s ease",
          },
          className: "animate-node-in",
        })),
    [layoutYByNodeId, sortedByDepth, visibleDepths, selectedId]
  );

  const visibleNodeIds = useMemo(
    () => new Set(animatedNodes.map((n) => n.id)),
    [animatedNodes]
  );

  const animatedEdges = useMemo(
    () =>
      laidOutGraph.edges
        .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        .map((e) => {
          const flow = e.data?.flow as DataFlow | undefined;
          return {
            ...e,
            className: "animate-edge-in",
            label: !isTreeView && flow ? flow.format : undefined,
            labelStyle: { fill: "#cbd5e1", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#172033", fillOpacity: 0.96 },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 4,
          };
        }),
    [isTreeView, laidOutGraph.edges, visibleNodeIds]
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
  const toggleExtension = useCallback((extension: string) => {
    setHiddenExtensions((current) => {
      const next = new Set(current);
      if (next.has(extension)) next.delete(extension);
      else next.add(extension);
      return next;
    });
  }, []);
  const resetLayout = useCallback(() => {
    setManualPositions({});
    setSelectedFlow(null);
    requestAnimationFrame(() => flowRef.current?.fitView({ padding: 0.25, duration: 300 }));
  }, []);
  const commitPendingPositions = useCallback(() => {
    const pending = pendingPositionsRef.current;
    pendingPositionsRef.current = {};
    positionFrameRef.current = null;
    setManualPositions((current) => ({ ...current, ...pending }));
  }, []);
  const handleNodeDrag = useCallback((_event: React.MouseEvent, node: Node<FileNodeData>) => {
    pendingPositionsRef.current[node.id] = node.position;
    if (positionFrameRef.current === null) {
      positionFrameRef.current = requestAnimationFrame(commitPendingPositions);
    }
  }, [commitPendingPositions]);
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node<FileNodeData>) => {
    pendingPositionsRef.current[node.id] = node.position;
    if (positionFrameRef.current !== null) cancelAnimationFrame(positionFrameRef.current);
    commitPendingPositions();
  }, [commitPendingPositions]);
  useEffect(() => () => {
    if (positionFrameRef.current !== null) cancelAnimationFrame(positionFrameRef.current);
  }, []);
  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedFlow((edge.data?.flow as DataFlow | undefined) ?? null);
  }, []);

  const visibleExtensionCount = fileExtensions.filter((extension) => !hiddenExtensions.has(extension)).length;
  const filterKey = Array.from(hiddenExtensions).sort().join(",");
  const featureOptions = useMemo(
    () => (Object.keys(dependencyFeatureLabels) as DependencyFeature[])
      .filter((feature) => nodes.some((node) => node.data.feature === feature)),
    [nodes]
  );

  return (
    <div className="graph-surface h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-[#11172a] dark:shadow-black/30">
      <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{isTreeView ? "Folder-first view" : "Dependency view"}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isTreeView
                ? `Click a folder to show or hide its contents · ${visibleTreeNodes.length} of ${filteredNodes.length} filtered items visible`
                : `${filteredNodes.length} of ${nodes.length} analyzed files · lines show detected imports`}
            </p>
          </div>
          {isTreeView && (
            <div className="flex gap-1.5">
              <button type="button" onClick={expandAll} className="rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500">Expand all</button>
              <button type="button" onClick={collapseAll} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10">Collapse all</button>
            </div>
          )}
        </div>
        {isTreeView && fileExtensions.length > 0 && (
          <details className="relative mt-2 border-t border-slate-200 pt-2 dark:border-white/10">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-indigo-700 marker:hidden dark:text-indigo-300">
              <SlidersHorizontal size={13} /> File types ({visibleExtensionCount}/{fileExtensions.length})
            </summary>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
              <div className="mb-2 flex gap-1.5">
                <button type="button" onClick={() => setHiddenExtensions(new Set())} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">Show all</button>
                <button type="button" onClick={() => setHiddenExtensions(new Set(fileExtensions))} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">Hide all</button>
              </div>
              {fileExtensions.map((extension) => (
                <label key={extension} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[11px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={!hiddenExtensions.has(extension)}
                    onChange={() => toggleExtension(extension)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                  />
                  <span>{extension === "[no extension]" ? extension : `.${extension}`}</span>
                </label>
              ))}
            </div>
          </details>
        )}
        {!isTreeView && featureOptions.length > 1 && onFeatureChange && (
          <div className="mt-2 flex max-w-full gap-1 overflow-x-auto border-t border-slate-200 pt-2 dark:border-white/10">
            <button type="button" onClick={() => onFeatureChange("all")} className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${activeFeature === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"}`}>All features</button>
            {featureOptions.map((feature) => (
              <button key={feature} type="button" onClick={() => onFeatureChange(feature)} className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${activeFeature === feature ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"}`}>{dependencyFeatureLabels[feature]}</button>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-1 border-t border-slate-200 pt-2 dark:border-white/10">
          <button type="button" onClick={() => flowRef.current?.zoomIn({ duration: 200 })} aria-label="Zoom in" title="Zoom in" className="rounded-md bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"><ZoomIn size={14} /></button>
          <button type="button" onClick={() => flowRef.current?.zoomOut({ duration: 200 })} aria-label="Zoom out" title="Zoom out" className="rounded-md bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"><ZoomOut size={14} /></button>
          <button type="button" onClick={() => flowRef.current?.fitView({ padding: 0.25, duration: 300 })} aria-label="Fit graph to view" title="Fit graph to view" className="rounded-md bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"><Maximize2 size={14} /></button>
          <button type="button" onClick={resetLayout} aria-label="Reset node layout" title="Reset node layout" className="rounded-md bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"><RotateCcw size={14} /></button>
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400"><Move size={12} /> Drag nodes to arrange them</span>
        </div>
      </div>
      {selectedFlow && (
        <div className="absolute bottom-4 left-4 z-10 max-w-sm rounded-xl border border-indigo-400/25 bg-[#11172a]/95 p-3 text-xs text-slate-200 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-300">Dependency format</p><p className="mt-1 font-semibold text-white">{selectedFlow.format}</p><p className="mt-1.5 leading-relaxed text-slate-300">{selectedFlow.detail}</p><p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">{selectedFlow.transport} · {selectedFlow.confidence}</p></div><button type="button" onClick={() => setSelectedFlow(null)} aria-label="Close flow details" className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white">×</button></div>
        </div>
      )}
      <ReactFlow
        key={`${mode}:${filterKey}`}
        nodes={animatedNodes}
        edges={animatedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        onInit={(instance) => { flowRef.current = instance; }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.1}
      >
        <Background color="var(--graph-grid)" gap={20} size={1} />
        <MiniMap maskColor="var(--graph-minimap-mask)" />
      </ReactFlow>
    </div>
  );
}

