import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import type { ServiceDetail } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

function subtitle(service: ServiceDetail): string {
  if (service.service_type === "ai_model") {
    const parts: string[] = [];
    if (service.engine_provider) parts.push(service.engine_provider);
    if (service.platform_provider) parts.push(`via ${service.platform_provider}`);
    return parts.join(" — ");
  }
  if (service.service_type === "mcp_server") {
    return [service.provider_org, service.target_service].filter(Boolean).join(" — ");
  }
  return "";
}

function metaEntries(service: ServiceDetail): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string }> = [];
  if (service.service_type === "ai_model") {
    if (service.engine_provider) entries.push({ label: "Engine Provider", value: service.engine_provider });
    entries.push({ label: "Platform", value: service.platform_provider ?? "Direct API" });
    if (service.model_version) entries.push({ label: "Model Version", value: service.model_version });
  } else if (service.service_type === "mcp_server") {
    if (service.provider_org) entries.push({ label: "Provider Org", value: service.provider_org });
    if (service.target_service) entries.push({ label: "Target Service", value: service.target_service });
    if (service.provider_tier) entries.push({ label: "Provider Tier", value: service.provider_tier.replace(/_/g, " ") });
    if (service.hosting_type) entries.push({ label: "Hosting", value: service.hosting_type.replace(/_/g, " ") });
  }
  if (service.scored_at) {
    entries.push({ label: "Last Scanned", value: new Date(service.scored_at).toLocaleDateString() });
  }
  return entries;
}

export function ServiceHero({ service }: { service: ServiceDetail }) {
  const grade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);
  const sub = subtitle(service);
  const meta = metaEntries(service);

  return (
    <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-7 flex gap-8 items-start mb-5">
      <div className="flex-1 min-w-0">
        <TypeChip type={service.service_type} />
        <h1 className="text-[26px] font-bold text-[#c9d1d9] mt-2.5 mb-1.5 leading-tight">
          {service.name}
        </h1>
        {sub && (
          <p className="text-[14px] text-[#8b949e] mb-4">{sub}</p>
        )}
        {meta.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {meta.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#8b949e]">
                  {label}
                </span>
                <span className="text-[13px] text-[#c9d1d9] font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-center gap-3">
        {grade && service.composite_score != null && (
          <div className="flex flex-col items-center bg-[#0d1117] rounded-xl border border-[#30363d] px-7 py-5 gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#8b949e]">
              Composite Score
            </span>
            <GradeBadge grade={grade} size="lg" variant="dark" />
            <span className="text-[22px] font-semibold text-[#c9d1d9]">
              {Math.round(service.composite_score)}{" "}
              <span className="text-[14px] font-normal text-[#8b949e]">/ 1000</span>
            </span>
            <span className="text-[11px] text-[#8b949e]">Weighted avg of 6 pillars</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-[#0d1117] rounded-lg border border-[#30363d] px-3.5 py-2">
          <span className="text-[16px]">🔬</span>
          <span className="text-[12px] text-[#8b949e]">
            Confidence:{" "}
            <strong className="text-[#c9d1d9]">
              {service.confidence} {service.confidence === 1 ? "scanner" : "scanners"}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
