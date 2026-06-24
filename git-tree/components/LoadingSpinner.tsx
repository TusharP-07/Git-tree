export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}