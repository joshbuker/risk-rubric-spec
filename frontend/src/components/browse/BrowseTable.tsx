import { ServiceRow } from "./ServiceRow";
import type { ServiceListItem, PillarBreakdown } from "@/lib/types";
import { PILLAR_LABELS } from "@/lib/scoring";

type SortKey = "composite_desc" | "confidence_desc" | "security_desc" | "updated_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "composite_desc",  label: "Composite Score ↓" },
  { value: "confidence_desc", label: "Confidence Index ↓" },
  { value: "security_desc",   label: "Security Score ↓"  },
  { value: "updated_desc",    label: "Recently Updated"   },
];

interface Props {
  services: ServiceListItem[];
  total: number;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  compareIds: Set<string>;
  onAddToCompare: (s: ServiceListItem) => void;
  onRemoveFromCompare: (s: ServiceListItem) => void;
  canAddToCompare: (s: ServiceListItem) => boolean;
}

const PILLAR_ENTRIES = Object.entries(PILLAR_LABELS) as [keyof PillarBreakdown, string][];

const thBase = "text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8b949e]";

export function BrowseTable({ services, total, sortKey, onSortChange, compareIds, onAddToCompare, onRemoveFromCompare, canAddToCompare }: Props) {
  if (services.length === 0) {
    return (
      <div className="text-center text-[#8b949e] py-16 text-[13px]">
        No services match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate [border-spacing:0_4px]">
        <thead>
          <tr>
            <th className={`${thBase} pb-2.5 text-left pl-3 whitespace-nowrap`}>
              Service
            </th>
            {PILLAR_ENTRIES.map(([key, label]) => (
              <th key={key} className={`${thBase} align-bottom pb-1 text-center`}>
                <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", display: "block" }}>
                  {label}
                </span>
              </th>
            ))}
            <th className={`${thBase} pb-2.5 text-center whitespace-nowrap`}>Score</th>
            <th className={`${thBase} pb-2.5 text-center whitespace-nowrap`}>Confidence</th>
            <th className="pb-2.5" />
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              isInCompare={compareIds.has(s.id)}
              onAddToCompare={onAddToCompare}
              onRemoveFromCompare={onRemoveFromCompare}
              canAddToCompare={canAddToCompare(s)}
            />
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-2.5 pt-3 border-t border-[#30363d]">
        <span className="text-[#8b949e] text-[12px]">{total} results</span>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-[#8b949e]">Sort:</span>
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="bg-[#161b22] border border-[#30363d] text-[#c9d1d9] rounded px-2 py-[3px] text-[12px] focus:outline-none focus:border-[#79c0ff]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
