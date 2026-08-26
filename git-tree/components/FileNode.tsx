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
      className={`rounded-xl border px-3 py-2 text-xs shadow-md shadow-slate-900/5 transition-colors dark:shadow-black/20 ${
        isFolder ? "bg-amber-50/90 dark:bg-amber-400/10" : "bg-white dark:bg-[#18213a]"
      }`}
      style={{ borderColor: isFolder ? "#D97706" : color, minWidth: 150 }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
            isFolder ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-slate-100 dark:bg-white/10"
          }`}
          style={isFolder ? undefined : { color }}
        >
          {isFolder ? (data.expanded ? "−" : "+") : "•"}
        </span>
        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{data.label}</span>
        {isFolder && data.childCount !== undefined && (
          <span className="ml-auto shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            {data.childCount}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(FileNode);
