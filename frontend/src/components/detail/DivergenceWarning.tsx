import type { PillarBreakdown } from "@/lib/types";
import { PILLAR_LABELS, getDivergingPillars } from "@/lib/scoring";

interface Props {
  scannerPillars: PillarBreakdown;
  aggregatePillars: PillarBreakdown;
}

export function DivergenceWarning({ scannerPillars, aggregatePillars }: Props) {
  const diverging = getDivergingPillars(scannerPillars, aggregatePillars);
  if (diverging.length === 0) return null;

  return (
    <div className="bg-[#2d2a1a] border border-[#ffa657] rounded-lg px-3 py-2 mt-3 text-xs text-[#ffa657]">
      ↕ This scanner&apos;s score differs from the aggregate by 100+ points on:{" "}
      <strong>{diverging.map((k) => PILLAR_LABELS[k]).join(", ")}</strong>
    </div>
  );
}
