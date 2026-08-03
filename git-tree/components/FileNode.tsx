import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FileNodeData } from "@/types";

const FOLDER_COLOR = "#F59E0B";
const FILE_COLORS: Record<string, string> = {
  js: "#F7DF1E",
  jsx: "#61DAFB",
  ts: "#3178C6",
  tsx: "#3178C6",
  py: "#3776AB",
  json: "#9CA3AF",
  md: "#6B7280",
  css: "#8B5CF6",
};

function FileNode({ data }: NodeProps<FileNodeData>) {
  const isFolder = data.fileType === "tree";
  const color = isFolder ? FOLDER_COLOR : FILE_COLORS[data.extension] || "#9CA3AF";

  return (
    <div
      className="rounded-md border bg-white px-3 py-2 text-xs shadow-sm dark:bg-gray-900"
      style={{ borderColor: color, minWidth: 120 }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate font-medium text-gray-800 dark:text-gray-100">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(FileNode);
