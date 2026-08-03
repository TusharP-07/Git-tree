"use client";

interface ModeToggleProps {
  mode: "tree" | "dependency";
  onChange: (mode: "tree" | "dependency") => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-md border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
      <button
        onClick={() => onChange("tree")}
        className={`rounded px-3 py-1.5 text-sm font-medium transition ${
          mode === "tree" ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        }`}
      >
        Tree View
      </button>
      <button
        onClick={() => onChange("dependency")}
        className={`rounded px-3 py-1.5 text-sm font-medium transition ${
          mode === "dependency" ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        }`}
      >
        Dependency View
      </button>
    </div>
  );
}
