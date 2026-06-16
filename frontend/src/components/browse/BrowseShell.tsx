"use client";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useServices } from "@/hooks/useServices";
import { useCompare } from "@/hooks/useCompare";
import { TypeTabs } from "./TypeTabs";
import { SidebarFilters } from "./SidebarFilters";
import type { ConfidenceTier } from "./SidebarFilters";
import { BrowseTable } from "./BrowseTable";
import type { ServiceListItem, ServiceType, Grade } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

type SortKey = "composite_desc" | "confidence_desc" | "security_desc" | "updated_desc";

function tierOf(confidence: number): ConfidenceTier {
  if (confidence >= 3) return "3+";
  if (confidence === 2) return "2";
  return "1";
}

export function BrowseShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() ?? "";

  const [activeTab, setActiveTab] = useState<ServiceType>("ai_model");
  const [selectedGrades, setSelectedGrades] = useState<Grade[]>(["A", "B", "C", "D", "F"]);
  const [confidenceTiers, setConfidenceTiers] = useState<Set<ConfidenceTier>>(new Set(["1", "2", "3+"]));
  const [excludedProviders, setExcludedProviders] = useState<Set<string>>(new Set());
  const [excludedPlatforms, setExcludedPlatforms] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("composite_desc");

  const { data: services = [], isLoading } = useServices();
  const { add, canAdd, count } = useCompare();

  const counts = useMemo(() => ({
    ai_model:   services.filter((s) => s.service_type === "ai_model").length,
    mcp_server: services.filter((s) => s.service_type === "mcp_server").length,
    agent: 0,
  }), [services]);

  const filtered = useMemo(() => {
    let list = services.filter((s) => {
      if (s.service_type !== activeTab) return false;
      if (s.composite_score == null) return false;

      const grade = s.grade ?? getGrade(s.composite_score);
      if (!selectedGrades.includes(grade)) return false;

      if (!confidenceTiers.has(tierOf(s.confidence))) return false;

      if (activeTab === "ai_model") {
        if (s.engine_provider && excludedProviders.has(s.engine_provider)) return false;
        const platform = s.platform_provider ?? "Direct API";
        if (excludedPlatforms.has(platform)) return false;
      }

      if (searchQuery && !s.name.toLowerCase().includes(searchQuery)) return false;

      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "composite_desc") return (b.composite_score ?? 0) - (a.composite_score ?? 0);
      if (sortKey === "confidence_desc") return b.confidence - a.confidence;
      if (sortKey === "security_desc") return (b.pillar_scores?.security ?? 0) - (a.pillar_scores?.security ?? 0);
      if (sortKey === "updated_desc") return (b.scored_at ?? "").localeCompare(a.scored_at ?? "");
      return 0;
    });

    return list;
  }, [services, activeTab, selectedGrades, confidenceTiers, excludedProviders, excludedPlatforms, searchQuery, sortKey]);

  function handleAddToCompare(s: ServiceListItem) {
    add({ id: s.id, service_type: s.service_type, name: s.name });
    if (count + 1 >= 2) router.push("/compare");
  }

  return (
    <div className="bg-[#0d1117] min-h-screen">
      <TypeTabs active={activeTab} counts={counts} onChange={setActiveTab} />
      <div className="flex">
        <SidebarFilters
          activeTab={activeTab}
          services={services}
          selectedGrades={selectedGrades}
          confidenceTiers={confidenceTiers}
          excludedProviders={excludedProviders}
          excludedPlatforms={excludedPlatforms}
          onGradesChange={setSelectedGrades}
          onConfidenceTiersChange={setConfidenceTiers}
          onExcludedProvidersChange={setExcludedProviders}
          onExcludedPlatformsChange={setExcludedPlatforms}
        />
        <div className="flex-1 px-5 py-4">
          {isLoading ? (
            <div className="text-center text-[#8b949e] py-16">Loading…</div>
          ) : (
            <BrowseTable
              services={filtered}
              total={filtered.length}
              sortKey={sortKey}
              onSortChange={setSortKey}
              onAddToCompare={handleAddToCompare}
              canAddToCompare={(s) => canAdd(s.service_type)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
