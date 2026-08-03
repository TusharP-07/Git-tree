export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white/70 py-12 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-[#11172a]/80 dark:shadow-black/30">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
