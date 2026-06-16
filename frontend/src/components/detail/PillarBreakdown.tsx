import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { PillarBreakdown as PillarBreakdownType } from "@/lib/types";
import { PILLAR_LABELS, PILLAR_KEYS, PILLAR_WEIGHTS, getGrade } from "@/lib/scoring";

export function PillarBreakdown({ pillars }: { pillars: PillarBreakdownType }) {
  return (
    <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 mb-5">
      <h2 className="text-xs font-bold uppercase text-[#8b949e] tracking-wide mb-4">
        Pillar Breakdown
      </h2>
      <div className="flex flex-col gap-0">
        {PILLAR_KEYS.map((key) => {
          const score = pillars[key];
          const grade = getGrade(score);
          const weight = PILLAR_WEIGHTS[key];
          return (
            <div key={key} className="grid grid-cols-[180px_36px_1fr_56px] items-center gap-3 py-2.5 border-b border-[#21262d] last:border-0">
              <span className="text-sm text-[#c9d1d9] font-medium">
                {PILLAR_LABELS[key]}
                <span className="ml-1 text-xs text-[#8b949e]">{(weight * 100).toFixed(0)}%</span>
              </span>
              <GradeBadge grade={grade} size="sm" variant="dark" />
              <ProgressBar score={score} grade={grade} />
              <span className="text-right text-sm font-semibold text-[#c9d1d9]">
                {Math.round(score)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
