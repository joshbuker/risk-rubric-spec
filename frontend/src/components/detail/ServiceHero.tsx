import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import { ConfidenceChip } from "@/components/ui/ConfidenceChip";
import type { ServiceDetail } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

export function ServiceHero({ service }: { service: ServiceDetail }) {
  const grade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-7 flex gap-8 items-start mb-5">
      <div className="flex-1 min-w-0">
        <TypeChip type={service.service_type} />
        <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">{service.name}</h1>
        <ConfidenceChip count={service.confidence} />
      </div>
      {grade && service.composite_score != null && (
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="flex flex-col items-center bg-slate-50 rounded-xl border border-slate-200 px-7 py-5 gap-1">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Grade</span>
            <GradeBadge grade={grade} size="lg" />
            <span className="text-xl font-bold text-slate-700">{Math.round(service.composite_score)}</span>
            <span className="text-xs text-slate-400">weighted avg</span>
          </div>
        </div>
      )}
    </div>
  );
}
