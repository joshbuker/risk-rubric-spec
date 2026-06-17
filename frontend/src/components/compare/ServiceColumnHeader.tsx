import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import type { ServiceDetail } from "@/lib/types";
import { getGrade, isStale } from "@/lib/scoring";

interface Props {
  service: ServiceDetail;
  onRemove: () => void;
}

function subtitle(service: ServiceDetail): string {
  if (service.service_type === "ai_model") {
    return [service.engine_provider, service.platform_provider ?? "Direct API"]
      .filter(Boolean)
      .join(" · ");
  }
  if (service.service_type === "mcp_server") {
    return [service.provider_org, service.target_service].filter(Boolean).join(" · ");
  }
  return "";
}

export function ServiceColumnHeader({ service, onRemove }: Props) {
  const grade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);
  const sub = subtitle(service);
  const stale = isStale(service.scored_at);

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
        <div className="font-bold text-[14px] text-[#c9d1d9] leading-snug">{service.name}</div>
        {sub && <div className="text-[11px] text-[#8b949e] mt-0.5">{sub}</div>}
      </div>
      {grade && service.composite_score != null && (
        <div className="flex items-center gap-2.5">
          <GradeBadge grade={grade} size="lg" variant="dark" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[20px] font-bold text-[#c9d1d9] leading-none">
              {Math.round(service.composite_score)}
            </span>
            <span className="text-[11px] text-[#8b949e]">
              C={service.confidence} {service.confidence === 1 ? "scanner" : "scanners"}
            </span>
            {stale && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#2d2a1a] text-[#ffa657] border border-[#ffa657] px-[7px] py-[2px] rounded-full w-fit">
                ⚠ Stale &gt;90d
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
