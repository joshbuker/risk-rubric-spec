export function ConfidenceChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-[#8b949e] bg-[#21262d] border border-[#30363d]">
      🔍 C={count}
    </span>
  );
}
