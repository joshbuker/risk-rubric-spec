import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { PillarBreakdown } from "@/lib/types";
import { PILLAR_LABELS, getGrade } from "@/lib/scoring";

interface ServicePillarData {
  id: string;
  name: string;
  pillars: PillarBreakdown;
  composite_score: number | null;
}

interface Props {
  pillarKey: keyof PillarBreakdown;
  services: ServicePillarData[];
}

export function PillarCompareRow({ pillarKey, services }: Props) {
  const scores = services.map((s) => s.pillars[pillarKey]);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 bg-white">
        <div className="text-sm font-semibold text-slate-600">{PILLAR_LABELS[pillarKey]}</div>
      </td>
      {services.map((s) => {
        const score = s.pillars[pillarKey];
        const grade = getGrade(score);
        const isBest  = score === maxScore;
        const isWorst = score === minScore && minScore !== maxScore;
        return (
          <td
            key={s.id}
            data-service-id={s.id}
            className={`px-4 py-3 border-l border-slate-200 ${isBest ? "bg-green-50" : isWorst ? "bg-red-50" : "bg-white"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <GradeBadge grade={grade} size="sm" />
              <span className="text-sm font-bold text-slate-800">{Math.round(score)}</span>
              {isBest  && <span className="text-xs text-green-700 font-semibold">▲ Best</span>}
              {isWorst && <span className="text-xs text-red-600 font-semibold">▼ Low</span>}
            </div>
            <ProgressBar score={score} grade={grade} />
          </td>
        );
      })}
      <td className="border-l border-slate-200 bg-slate-50" />
    </tr>
  );
}
