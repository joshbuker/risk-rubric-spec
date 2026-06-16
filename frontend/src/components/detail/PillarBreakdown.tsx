import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { PillarBreakdown as PillarBreakdownType } from "@/lib/types";
import { PILLAR_LABELS, PILLAR_KEYS, PILLAR_WEIGHTS, getGrade } from "@/lib/scoring";

export function PillarBreakdown({ pillars }: { pillars: PillarBreakdownType }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
      <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-4">
        Pillar Breakdown
      </h2>
      <div className="flex flex-col gap-0">
        {PILLAR_KEYS.map((key) => {
          const score = pillars[key];
          const grade = getGrade(score);
          const weight = PILLAR_WEIGHTS[key];
          return (
            <div key={key} className="grid grid-cols-[180px_36px_1fr_56px] items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600 font-medium">
                {PILLAR_LABELS[key]}
                <span className="ml-1 text-xs text-slate-300">{(weight * 100).toFixed(0)}%</span>
              </span>
              <GradeBadge grade={grade} size="sm" />
              <ProgressBar score={score} grade={grade} />
              <span className="text-right text-sm font-semibold text-slate-700">
                {Math.round(score)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
