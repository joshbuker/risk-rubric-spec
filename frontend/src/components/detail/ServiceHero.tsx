import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import { ConfidenceChip } from "@/components/ui/ConfidenceChip";
import type { ServiceDetail } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

export function ServiceHero({ service }: { service: ServiceDetail }) {
  const grade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);

  return (
    <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-7 flex gap-8 items-start mb-5">
      <div className="flex-1 min-w-0">
        <TypeChip type={service.service_type} />
        <h1 className="text-2xl font-bold text-[#c9d1d9] mt-2 mb-1">{service.name}</h1>
        <ConfidenceChip count={service.confidence} />
      </div>
      {grade && service.composite_score != null && (
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="flex flex-col items-center bg-[#0d1117] rounded-xl border border-[#30363d] px-7 py-5 gap-1">
            <span className="text-xs font-bold uppercase text-[#8b949e] tracking-wide">Grade</span>
            <GradeBadge grade={grade} size="lg" variant="dark" />
            <span className="text-xl font-bold text-[#c9d1d9]">{Math.round(service.composite_score)}</span>
            <span className="text-xs text-[#8b949e]">weighted avg</span>
          </div>
        </div>
      )}
    </div>
  );
}
