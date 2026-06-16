import Link from "next/link";
import { GradeBadge } from "@/components/ui/GradeBadge";
import type { ServiceListItem, Grade } from "@/lib/types";
import { PILLAR_KEYS, getGrade } from "@/lib/scoring";

interface Props {
  service: ServiceListItem;
  onAddToCompare: (s: ServiceListItem) => void;
  canAddToCompare: boolean;
}

function subtitle(s: ServiceListItem): string {
  if (s.service_type === "ai_model") {
    const platform = s.platform_provider ?? "Direct API";
    return s.engine_provider ? `${s.engine_provider} · ${platform}` : platform;
  }
  if (s.service_type === "mcp_server") {
    return [s.provider_org, s.target_service].filter(Boolean).join(" · ");
  }
  return "";
}

export function ServiceRow({ service, onAddToCompare, canAddToCompare }: Props) {
  const pillarGrades = PILLAR_KEYS.reduce<Partial<Record<string, Grade>>>((acc, key) => {
    const score = service.pillar_scores?.[key];
    if (score != null) acc[key] = getGrade(score);
    return acc;
  }, {});

  const hasFGrade = Object.values(pillarGrades).some((g) => g === "F");

  const borderColor = hasFGrade
    ? "border-[#f8514933]"
    : service.is_stale
    ? "border-[#ffa65744]"
    : "border-[#30363d]";

  const tdBase = `bg-[#161b22] border-y ${borderColor} py-2.5 text-[13px]`;
  const tdFirst = `${tdBase} border-l rounded-l-lg pl-3`;
  const tdLast  = `${tdBase} border-r rounded-r-lg pr-2.5`;

  const overallGrade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);

  return (
    <tr className="group">
      {/* Service name + subtitle */}
      <td className={`${tdFirst} min-w-[160px]`}>
        <Link href={`/services/${service.id}`} className="font-semibold text-[#c9d1d9] hover:text-[#79c0ff] text-[13px]">
          {service.name}
          {service.is_stale && (
            <span className="ml-2 bg-[#ffa65722] text-[#ffa657] rounded px-[5px] py-[1px] text-[10px]">
              ⚠ outdated scan
            </span>
          )}
        </Link>
        <div className="text-[#8b949e] text-[11px] mt-0.5">{subtitle(service)}</div>
      </td>

      {/* Per-pillar grade badges */}
      {PILLAR_KEYS.map((key) => (
        <td key={key} className={`${tdBase} px-1 text-center`}>
          {pillarGrades[key] ? (
            <GradeBadge grade={pillarGrades[key]!} size="sm" variant="dark" />
          ) : (
            <span className="text-[#8b949e]">—</span>
          )}
        </td>
      ))}

      {/* Overall score: badge + number */}
      <td className={`${tdBase} px-1 text-center`}>
        {overallGrade && service.composite_score != null ? (
          <div className="flex flex-col items-center gap-0.5">
            <GradeBadge grade={overallGrade} size="md" variant="dark" />
            <span className={`text-[11px] ${gradeColor(overallGrade)}`}>
              {Math.round(service.composite_score)}
            </span>
          </div>
        ) : (
          <span className="text-[#8b949e]">—</span>
        )}
      </td>

      {/* Confidence */}
      <td className={`${tdBase} px-2 text-center`}>
        <span className="text-[13px]">🔬</span>{" "}
        <strong className="text-[#c9d1d9]">{service.confidence}</strong>
      </td>

      {/* Actions */}
      <td className={`${tdLast} px-2`}>
        <div className="flex gap-[5px]">
          <Link
            href={`/services/${service.id}`}
            className="bg-[#21262d] border border-[#30363d] text-[#79c0ff] rounded px-[9px] py-[3px] text-[11px] hover:border-[#79c0ff] whitespace-nowrap"
          >
            View
          </Link>
          <button
            onClick={() => onAddToCompare(service)}
            disabled={!canAddToCompare}
            className="bg-[#21262d] border border-[#30363d] text-[#8b949e] rounded px-[9px] py-[3px] text-[11px] hover:text-[#c9d1d9] hover:border-[#8b949e] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            +Compare
          </button>
        </div>
      </td>
    </tr>
  );
}

function gradeColor(g: Grade): string {
  if (g === "A" || g === "B") return "text-[#56d364]";
  if (g === "C") return "text-[#ffa657]";
  if (g === "D") return "text-[#f0883e]";
  return "text-[#f85149]";
}
