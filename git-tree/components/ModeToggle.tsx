"use client";

interface ModeToggleProps {
  mode: "tree" | "dependency";
  onChange: (mode: "tree" | "dependency") => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
      <button
        onClick={() => onChange("tree")}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          mode === "tree" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        }`}
      >
        Tree View
      </button>
      <button
        onClick={() => onChange("dependency")}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          mode === "dependency" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        }`}
      >
        Dependency View
      </button>
    </div>
  );
}
