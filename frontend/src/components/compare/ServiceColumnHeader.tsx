import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import type { ServiceDetail } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

interface Props {
  service: ServiceDetail;
  onRemove: () => void;
}

export function ServiceColumnHeader({ service, onRemove }: Props) {
  const grade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);

  return (
    <div className="px-4 pt-5 pb-4 border-l border-slate-200 bg-slate-50 flex flex-col gap-2.5 border-b-2 border-b-slate-200">
      <div className="flex justify-between items-start">
        <TypeChip type={service.service_type} />
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded px-1 text-lg leading-none"
          aria-label={`Remove ${service.name} from comparison`}
        >
          ×
        </button>
      </div>
      <div>
        <div className="font-bold text-sm text-slate-900 leading-snug">{service.name}</div>
        {service.is_stale && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full mt-1">
            ⚠ Stale
          </span>
        )}
      </div>
      {grade && service.composite_score != null && (
        <div className="flex items-center gap-2.5">
          <GradeBadge grade={grade} size="lg" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-700">{Math.round(service.composite_score)}</span>
            <span className="text-xs text-slate-400">C={service.confidence}</span>
          </div>
        </div>
      )}
    </div>
  );
}
