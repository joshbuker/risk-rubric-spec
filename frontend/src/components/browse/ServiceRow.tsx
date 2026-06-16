import Link from "next/link";
import { GradeBadge } from "@/components/ui/GradeBadge";
import type { ServiceListItem, Grade } from "@/lib/types";
import { PILLAR_KEYS } from "@/lib/scoring";

interface Props {
  service: ServiceListItem & { pillar_grades?: Partial<Record<string, Grade>> };
  onAddToCompare: (s: ServiceListItem) => void;
  canAddToCompare: boolean;
}

export function ServiceRow({ service, onAddToCompare, canAddToCompare }: Props) {
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 text-sm ${service.is_stale ? "bg-amber-50" : ""}`}>
      <td className="px-4 py-3">
        <Link href={`/services/${service.id}`} className="font-semibold text-slate-800 hover:text-blue-600">
          {service.name}
        </Link>
      </td>
      {PILLAR_KEYS.map((key) => (
        <td key={key} className="px-3 py-3 text-center">
          {service.pillar_grades?.[key] ? (
            <GradeBadge grade={service.pillar_grades[key]!} size="sm" />
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
      ))}
      <td className="px-4 py-3 text-right font-semibold text-slate-700">
        {service.composite_score != null ? Math.round(service.composite_score) : "—"}
      </td>
      <td className="px-4 py-3 text-center text-slate-500 text-xs">
        C={service.confidence}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onAddToCompare(service)}
          disabled={!canAddToCompare}
          className="text-xs font-semibold px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Add to compare"
        >
          + Compare
        </button>
      </td>
    </tr>
  );
}
