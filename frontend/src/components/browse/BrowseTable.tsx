import { ServiceRow } from "./ServiceRow";
import type { ServiceListItem } from "@/lib/types";
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
  onAddToCompare: (s: ServiceListItem) => void;
  canAddToCompare: (s: ServiceListItem) => boolean;
}

const PILLAR_ENTRIES = Object.entries(PILLAR_LABELS);

export function BrowseTable({ services, total, sortKey, onSortChange, onAddToCompare, canAddToCompare }: Props) {
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
            <th className="px-3 pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8b949e] whitespace-nowrap">
              Service
            </th>
            {PILLAR_ENTRIES.map(([key, label]) => (
              <th key={key} className="px-1 pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8b949e] whitespace-nowrap">
                {label}
              </th>
            ))}
            <th className="px-1 pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8b949e]">Score</th>
            <th className="px-1 pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8b949e]">Confidence</th>
            <th className="pb-2.5" />
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              onAddToCompare={onAddToCompare}
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
