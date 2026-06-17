import type { Grade } from "@/lib/types";

const BAR_CLASSES: Record<Grade, string> = {
  A: "bg-green-500",
  B: "bg-emerald-400",
  C: "bg-yellow-400",
  D: "bg-orange-400",
  F: "bg-red-500",
};

interface Props {
  score: number; // 0–1000
  grade: Grade;
  thick?: boolean;
}

export function ProgressBar({ score, grade, thick }: Props) {
  const pct = Math.min(100, Math.max(0, score / 10));
  return (
    <div className={`w-full rounded-full bg-[#21262d] overflow-hidden ${thick ? "h-3" : "h-2"}`}>
      <div
        className={`h-full rounded-full ${BAR_CLASSES[grade]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
