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

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url.trimStart());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function ScannerAccordion({ scanner, aggregatePillars }: Props) {
  const [open, setOpen] = useState(false);
  const grade = getGrade(scanner.composite_score);
  const diverges = hasDivergence(scanner.pillars, aggregatePillars);
  const scoredDate = new Date(scanner.scored_at).toLocaleDateString();

  return (
    <div className="border border-[#30363d] rounded-lg overflow-hidden mb-3 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#161b22] hover:bg-[#1c2128] text-left"
      >
        <span className="font-semibold text-sm text-[#79c0ff] flex-1">{scanner.scanner_name}</span>
        <span className="text-xs text-[#8b949e]">{scoredDate}</span>
        {diverges && (
          <span className="text-xs font-semibold bg-[#2d2a1a] text-[#ffa657] border border-[#ffa657] px-2 py-0.5 rounded-full">
            ↕ Diverges
          </span>
        )}
        <GradeBadge grade={grade} size="sm" variant="dark" />
        <span className="text-sm font-bold text-[#c9d1d9]">{Math.round(scanner.composite_score)}</span>
        <span className="text-[#8b949e] text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-[#0d1117]">
          {PILLAR_KEYS.map((key) => {
            const score = scanner.pillars[key];
            const g = getGrade(score);
            return (
              <div key={key} className="grid grid-cols-[160px_28px_1fr_44px] items-center gap-2 py-1.5 border-b border-[#21262d] last:border-0 text-xs">
                <span className="text-[#8b949e]">{PILLAR_LABELS[key]}</span>
                <GradeBadge grade={g} size="sm" variant="dark" />
                <ProgressBar score={score} grade={g} />
                <span className="text-right font-semibold text-[#c9d1d9]">{Math.round(score)}</span>
              </div>
            );
          })}

          {scanner.evidence.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#21262d]">
              <div className="text-xs font-bold uppercase text-[#8b949e] mb-1.5">Evidence</div>
              {scanner.evidence.map((e, i) =>
                isSafeUrl(e.url) ? (
                  <a key={i} href={e.url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-xs text-[#79c0ff] hover:underline mr-4">
                    ↗ {e.label}
                  </a>
                ) : (
                  <span key={i} className="inline-flex items-center gap-1 text-xs text-[#8b949e] mr-4">
                    ↗ {e.label}
                  </span>
                )
              )}
            </div>
          )}

          <DivergenceWarning scannerPillars={scanner.pillars} aggregatePillars={aggregatePillars} />
        </div>
      )}
    </div>
  );
}
