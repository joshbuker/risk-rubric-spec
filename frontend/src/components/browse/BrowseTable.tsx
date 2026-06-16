import { ServiceRow } from "./ServiceRow";
import type { ServiceListItem } from "@/lib/types";
import { PILLAR_LABELS } from "@/lib/scoring";

interface Props {
  services: ServiceListItem[];
  onAddToCompare: (s: ServiceListItem) => void;
  canAddToCompare: (s: ServiceListItem) => boolean;
}

const PILLAR_ENTRIES = Object.entries(PILLAR_LABELS);

export function BrowseTable({ services, onAddToCompare, canAddToCompare }: Props) {
  if (services.length === 0) {
    return (
      <div className="text-center text-slate-400 py-16 text-sm">
        No services match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400 tracking-wide">Service</th>
            {PILLAR_ENTRIES.map(([key, label]) => (
              <th key={key} className="px-3 py-2.5 text-center text-xs font-bold uppercase text-slate-400 tracking-wide">
                {label}
              </th>
            ))}
            <th className="px-4 py-2.5 text-right text-xs font-bold uppercase text-slate-400">Score</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-slate-400">C</th>
            <th className="px-4 py-2.5"></th>
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
    </div>
  );
}
