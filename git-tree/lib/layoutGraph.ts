import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import type { FileNodeData } from "@/types";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;

export function layoutGraph(
  nodes: Node<FileNodeData>[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node<FileNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const { x, y } = g.node(node.id);
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}