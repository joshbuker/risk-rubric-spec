import { ServiceColumnHeader } from "./ServiceColumnHeader";
import { GradeBadge } from "@/components/ui/GradeBadge";
import type { ServiceDetail, PillarBreakdown } from "@/lib/types";
import { PILLAR_KEYS, PILLAR_LABELS, getGrade } from "@/lib/scoring";
import React from "react";

interface Props {
  services: ServiceDetail[];
  onRemove: (id: string) => void;
}

export function CompareGrid({ services, onRemove }: Props) {
  const serviceColWidth = `minmax(180px, 1fr)`;
  const gridCols = `190px repeat(${services.length}, ${serviceColWidth}) 130px`;

  const pillarServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    pillars: s.pillars ?? ({} as PillarBreakdown),
    composite_score: s.composite_score,
  }));

  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden overflow-x-auto">
      <div style={{ display: "grid", gridTemplateColumns: gridCols }}>

        {/* Header row */}
        <div className="px-4 py-4 bg-[#161b22] border-b-2 border-b-[#30363d] flex items-end">
          <span className="text-xs font-bold uppercase text-[#8b949e] tracking-wide">Pillar</span>
        </div>
        {services.map((s) => (
          <ServiceColumnHeader key={s.id} service={s} onRemove={() => onRemove(s.id)} />
        ))}
        <div className="px-3 py-4 bg-[#161b22] border-l border-[#30363d] border-b-2 border-b-[#30363d] flex items-center justify-center">
          <span className="text-xs font-bold uppercase text-[#8b949e]">Add</span>
        </div>

        {/* Composite summary row */}
        <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center">
          <span className="text-xs font-bold uppercase text-[#8b949e] tracking-wide">Composite Score</span>
        </div>
        {services.map((s) => {
          const grade = s.grade ?? (s.composite_score != null ? getGrade(s.composite_score) : null);
          return (
            <div key={s.id} className="px-4 py-3 border-l border-[#30363d] bg-[#161b22] border-b border-b-[#30363d] flex items-center gap-2">
              {grade && <GradeBadge grade={grade} size="sm" variant="dark" />}
              <span className="text-base font-bold text-[#c9d1d9]">
                {s.composite_score != null ? Math.round(s.composite_score) : "—"}
              </span>
            </div>
          );
        })}
        <div className="border-l border-[#30363d] bg-[#161b22] border-b border-b-[#30363d]" />

        {/* Pillar rows */}
        {PILLAR_KEYS.map((key) => (
          <React.Fragment key={key}>
            <div className="px-4 py-3 bg-[#0d1117] border-b border-[#21262d] last:border-0 flex flex-col justify-center gap-0.5">
              <span className="text-sm font-semibold text-[#c9d1d9]">{PILLAR_LABELS[key]}</span>
            </div>
            {pillarServices.map((s) => {
              const score = s.pillars?.[key as keyof PillarBreakdown] ?? 0;
              const grade = getGrade(score);
              const scores = pillarServices.map((sv) => sv.pillars?.[key as keyof PillarBreakdown] ?? 0);
              const isBest  = score === Math.max(...scores);
              const isWorst = score === Math.min(...scores) && Math.min(...scores) !== Math.max(...scores);
              return (
                <div
                  key={`${s.id}-${key}`}
                  className={`px-4 py-3 border-l border-[#30363d] border-b border-[#21262d] flex flex-col gap-1.5 ${isBest ? "bg-[#1a2a1a]" : isWorst ? "bg-[#2a1a1a]" : "bg-[#0d1117]"}`}
                >
                  <div className="flex items-center gap-2">
                    <GradeBadge grade={grade} size="sm" variant="dark" />
                    <span className="text-sm font-bold text-[#c9d1d9]">{Math.round(score)}</span>
                    {isBest  && <span className="text-xs text-[#56d364] font-semibold">▲ Best</span>}
                    {isWorst && <span className="text-xs text-[#f85149] font-semibold">▼ Low</span>}
                  </div>
                </div>
              );
            })}
            <div className="border-l border-[#30363d] bg-[#161b22] border-b border-[#21262d]" />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
