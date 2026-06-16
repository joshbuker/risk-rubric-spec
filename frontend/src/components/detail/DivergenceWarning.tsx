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
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 mt-3 text-xs text-amber-800">
      ↕ This scanner&apos;s score differs from the aggregate by 100+ points on:{" "}
      <strong>{diverging.map((k) => PILLAR_LABELS[k]).join(", ")}</strong>
    </div>
  );
}
