import Link from "next/link";
import { ServiceColumnHeader } from "./ServiceColumnHeader";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ServiceDetail, PillarBreakdown } from "@/lib/types";
import { PILLAR_KEYS, PILLAR_LABELS, PILLAR_WEIGHTS, getGrade } from "@/lib/scoring";
import React from "react";

interface Props {
  services: ServiceDetail[];
  onRemove: (id: string) => void;
  lockedType?: string | null;
}

const PILLAR_NOTES: Partial<Record<keyof PillarBreakdown, string>> = {
  security: "· highest",
};

export function CompareGrid({ services, onRemove, lockedType }: Props) {
  const canAddMore = services.length < 4;
  const serviceColWidth = `minmax(180px, 1fr)`;
  const gridCols = canAddMore
    ? `190px repeat(${services.length}, ${serviceColWidth}) 130px`
    : `190px repeat(${services.length}, ${serviceColWidth})`;

  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden overflow-x-auto">
      <div style={{ display: "grid", gridTemplateColumns: gridCols }}>

        {/* Header row */}
        <div className="px-4 py-4 bg-[#161b22] border-b-2 border-b-[#30363d] flex items-end">
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8b949e]">Service</span>
        </div>
        {services.map((s) => (
          <ServiceColumnHeader key={s.id} service={s} onRemove={() => onRemove(s.id)} />
        ))}
        {canAddMore && (
          <div className="border-l border-[#30363d] border-b-2 border-b-[#30363d] bg-[#161b22] flex items-center justify-center">
            <Link
              href={lockedType ? `/browse?tab=${lockedType}` : "/browse"}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-[#30363d] hover:border-[#8b949e] text-[#8b949e] hover:text-[#c9d1d9] transition-colors text-center"
            >
              <span className="text-xl leading-none">+</span>
              <span className="text-[10px] font-medium">Add from<br />Browse</span>
            </Link>
          </div>
        )}

        {/* Composite summary row */}
        <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8b949e]">Composite Score</span>
        </div>
        {services.map((s) => {
          const grade = s.grade ?? (s.composite_score != null ? getGrade(s.composite_score) : null);
          return (
            <div key={s.id} className="px-4 py-3 border-l border-[#30363d] bg-[#161b22] border-b border-b-[#30363d] flex items-center gap-2.5">
              {grade && <GradeBadge grade={grade} size="sm" variant="dark" />}
              <div className="flex flex-col gap-0">
                <span className="text-[15px] font-bold text-[#c9d1d9]">
                  {s.composite_score != null ? Math.round(s.composite_score) : "—"}
                </span>
                <span className="text-[10px] text-[#8b949e]">weighted avg</span>
              </div>
            </div>
          );
        })}
        {canAddMore && <div className="border-l border-[#30363d] bg-[#161b22] border-b border-b-[#30363d]" />}

        {/* Pillar rows */}
        {PILLAR_KEYS.map((key) => {
          const weight = PILLAR_WEIGHTS[key];
          const note = PILLAR_NOTES[key];
          const scores = services.map((s) => s.pillars?.[key as keyof PillarBreakdown] ?? 0);
          const maxScore = Math.max(...scores);
          const minScore = Math.min(...scores);

          return (
            <React.Fragment key={key}>
              <div className="px-4 py-3 bg-[#0d1117] border-b border-[#21262d] last:border-0 flex flex-col justify-center gap-0.5">
                <span className="text-[13px] font-semibold text-[#c9d1d9]">{PILLAR_LABELS[key]}</span>
                <span className="text-[10px] text-[#8b949e]">
                  {(weight * 100).toFixed(0)}% weight{note ? ` ${note}` : ""}
                </span>
              </div>
              {services.map((s) => {
                const score = s.pillars?.[key as keyof PillarBreakdown] ?? 0;
                const grade = getGrade(score);
                const isBest  = score === maxScore;
                const isWorst = score === minScore && minScore !== maxScore;
                return (
                  <div
                    key={`${s.id}-${key}`}
                    className={`px-4 py-3 border-l border-[#30363d] border-b border-[#21262d] flex flex-col gap-1.5 ${
                      isBest ? "bg-[#1a2a1a]" : isWorst ? "bg-[#2a1a1a]" : "bg-[#0d1117]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={grade} size="sm" variant="dark" />
                      <span className="text-[14px] font-bold text-[#c9d1d9]">{Math.round(score)}</span>
                      {isBest  && <span className="text-[10px] text-[#56d364] font-semibold">▲ Best</span>}
                      {isWorst && <span className="text-[10px] text-[#f85149] font-semibold">▼ Low</span>}
                    </div>
                    <ProgressBar score={score} grade={grade} />
                  </div>
                );
              })}
              {canAddMore && <div className="border-l border-[#30363d] bg-[#161b22] border-b border-[#21262d]" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
