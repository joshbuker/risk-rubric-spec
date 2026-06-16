"use client";
import { useState } from "react";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DivergenceWarning } from "./DivergenceWarning";
import type { ScannerScore, PillarBreakdown } from "@/lib/types";
import { PILLAR_KEYS, PILLAR_LABELS, getGrade, hasDivergence } from "@/lib/scoring";

interface Props {
  scanner: ScannerScore;
  aggregatePillars: PillarBreakdown;
}

export function ScannerAccordion({ scanner, aggregatePillars }: Props) {
  const [open, setOpen] = useState(false);
  const grade = getGrade(scanner.composite_score);
  const diverges = hasDivergence(scanner.pillars, aggregatePillars);
  const scoredDate = new Date(scanner.scored_at).toLocaleDateString();

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-3 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
      >
        <span className="font-semibold text-sm text-blue-700 flex-1">{scanner.scanner_name}</span>
        <span className="text-xs text-slate-400">{scoredDate}</span>
        {diverges && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
            ↕ Diverges
          </span>
        )}
        <GradeBadge grade={grade} size="sm" />
        <span className="text-sm font-bold text-slate-700">{Math.round(scanner.composite_score)}</span>
        <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3">
          {PILLAR_KEYS.map((key) => {
            const score = scanner.pillars[key];
            const g = getGrade(score);
            return (
              <div key={key} className="grid grid-cols-[160px_28px_1fr_44px] items-center gap-2 py-1.5 border-b border-slate-50 last:border-0 text-xs">
                <span className="text-slate-500">{PILLAR_LABELS[key]}</span>
                <GradeBadge grade={g} size="sm" />
                <ProgressBar score={score} grade={g} />
                <span className="text-right font-semibold text-slate-600">{Math.round(score)}</span>
              </div>
            );
          })}

          {scanner.evidence.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1.5">Evidence</div>
              {scanner.evidence.map((e, i) => (
                <a key={i} href={e.url} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-4">
                  ↗ {e.label}
                </a>
              ))}
            </div>
          )}

          <DivergenceWarning scannerPillars={scanner.pillars} aggregatePillars={aggregatePillars} />
        </div>
      )}
    </div>
  );
}
