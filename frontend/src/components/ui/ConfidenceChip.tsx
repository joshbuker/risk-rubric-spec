export function ConfidenceChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-slate-500 bg-slate-100 border border-slate-200">
      🔍 C={count}
    </span>
  );
}
