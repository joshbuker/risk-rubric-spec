import { ServiceColumnHeader } from "./ServiceColumnHeader";
import { PillarCompareRow } from "./PillarCompareRow";
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
      <div style={{ display: "grid", gridTemplateColumns: gridCols }}>

        {/* Header row */}
        <div className="px-4 py-4 bg-slate-50 border-b-2 border-b-slate-200 flex items-end">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Pillar</span>
        </div>
        {services.map((s) => (
          <ServiceColumnHeader key={s.id} service={s} onRemove={() => onRemove(s.id)} />
        ))}
        <div className="px-3 py-4 bg-slate-50 border-l border-slate-200 border-b-2 border-b-slate-200 flex items-center justify-center">
          <span className="text-xs font-bold uppercase text-slate-400">Add</span>
        </div>

        {/* Composite summary row */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Composite Score</span>
        </div>
        {services.map((s) => {
          const grade = s.grade ?? (s.composite_score != null ? getGrade(s.composite_score) : null);
          return (
            <div key={s.id} className="px-4 py-3 border-l border-slate-200 bg-slate-50 border-b border-b-slate-200 flex items-center gap-2">
              {grade && <span className={`inline-flex items-center justify-center w-8 h-6 text-sm font-bold rounded`}>{grade}</span>}
              <span className="text-base font-bold text-slate-800">
                {s.composite_score != null ? Math.round(s.composite_score) : "—"}
              </span>
            </div>
          );
        })}
        <div className="border-l border-slate-200 bg-slate-50 border-b border-b-slate-200" />

        {/* Pillar rows */}
        {PILLAR_KEYS.map((key) => (
          <React.Fragment key={key}>
            <div className="px-4 py-3 bg-white border-b border-slate-100 last:border-0 flex flex-col justify-center gap-0.5">
              <span className="text-sm font-semibold text-slate-600">{PILLAR_LABELS[key]}</span>
            </div>
            {services.map((s) => {
              const score = s.pillars?.[key as keyof PillarBreakdown] ?? 0;
              const grade = getGrade(score);
              const scores = services.map((sv) => sv.pillars?.[key as keyof PillarBreakdown] ?? 0);
              const isBest  = score === Math.max(...scores);
              const isWorst = score === Math.min(...scores) && Math.min(...scores) !== Math.max(...scores);
              return (
                <div
                  key={`${s.id}-${key}`}
                  className={`px-4 py-3 border-l border-slate-200 border-b border-slate-100 flex flex-col gap-1.5 ${isBest ? "bg-green-50" : isWorst ? "bg-red-50" : "bg-white"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{Math.round(score)}</span>
                    {isBest  && <span className="text-xs text-green-700 font-semibold">▲ Best</span>}
                    {isWorst && <span className="text-xs text-red-600 font-semibold">▼ Low</span>}
                  </div>
                </div>
              );
            })}
            <div className="border-l border-slate-200 bg-slate-50 border-b border-slate-100" />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
