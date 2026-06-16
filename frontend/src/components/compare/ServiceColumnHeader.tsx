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
    <div className="px-4 pt-5 pb-4 border-l border-[#30363d] bg-[#161b22] flex flex-col gap-2.5 border-b-2 border-b-[#30363d]">
      <div className="flex justify-between items-start">
        <TypeChip type={service.service_type} />
        <button
          onClick={onRemove}
          className="text-[#8b949e] hover:text-[#f85149] hover:bg-[#2d1a1a] rounded px-1 text-lg leading-none"
          aria-label={`Remove ${service.name} from comparison`}
        >
          ×
        </button>
      </div>
      <div>
        <div className="font-bold text-sm text-[#c9d1d9] leading-snug">{service.name}</div>
        {service.is_stale && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#2d2a1a] text-[#ffa657] border border-[#ffa657] px-2 py-0.5 rounded-full mt-1">
            ⚠ Stale
          </span>
        )}
      </div>
      {grade && service.composite_score != null && (
        <div className="flex items-center gap-2.5">
          <GradeBadge grade={grade} size="lg" variant="dark" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-[#c9d1d9]">{Math.round(service.composite_score)}</span>
            <span className="text-xs text-[#8b949e]">C={service.confidence}</span>
          </div>
        </div>
      )}
    </div>
  );
}
