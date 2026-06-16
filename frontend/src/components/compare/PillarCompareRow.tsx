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
    <tr className="border-b border-[#21262d] last:border-0">
      <td className="px-4 py-3 bg-[#0d1117]">
        <div className="text-sm font-semibold text-[#c9d1d9]">{PILLAR_LABELS[pillarKey]}</div>
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
            className={`px-4 py-3 border-l border-[#30363d] ${isBest ? "bg-[#1a472a22]" : isWorst ? "bg-[#2d1a1a22]" : "bg-[#0d1117]"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <GradeBadge grade={grade} size="sm" variant="dark" />
              <span className="text-sm font-bold text-[#c9d1d9]">{Math.round(score)}</span>
              {isBest  && <span className="text-xs text-[#56d364] font-semibold">▲ Best</span>}
              {isWorst && <span className="text-xs text-[#f85149] font-semibold">▼ Low</span>}
            </div>
            <ProgressBar score={score} grade={grade} />
          </td>
        );
      })}
      <td className="border-l border-[#30363d] bg-[#161b22]" />
    </tr>
  );
}
