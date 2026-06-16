"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useServices } from "@/hooks/useServices";
import { useCompare } from "@/hooks/useCompare";
import { TypeTabs } from "./TypeTabs";
import { SidebarFilters } from "./SidebarFilters";
import { BrowseTable } from "./BrowseTable";
import type { ServiceListItem, ServiceType, Grade } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

export function BrowseShell() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ServiceType>("ai_model");
  const [selectedGrades, setSelectedGrades] = useState<Grade[]>(["A", "B", "C", "D", "F"]);
  const [minConfidence, setMinConfidence] = useState(1);

  const { data: services = [], isLoading } = useServices(activeTab);
  const { add, canAdd, count } = useCompare();

  const counts = useMemo(() => ({
    ai_model: services.filter((s) => s.service_type === "ai_model").length,
    mcp_server: services.filter((s) => s.service_type === "mcp_server").length,
    agent: 0,
  }), [services]);

  const filtered = useMemo(() =>
    services.filter((s) => {
      if (s.composite_score == null) return false;
      const grade = s.grade ?? getGrade(s.composite_score);
      return selectedGrades.includes(grade) && s.confidence >= minConfidence;
    }),
    [services, selectedGrades, minConfidence]
  );

  function handleAddToCompare(s: ServiceListItem) {
    add({ id: s.id, service_type: s.service_type, name: s.name });
    if (count + 1 >= 2) router.push("/compare");
  }

  return (
    <div className="max-w-screen-xl mx-auto">
      <TypeTabs active={activeTab} counts={counts} onChange={setActiveTab} />
      <div className="flex min-h-screen">
        <SidebarFilters
          selectedGrades={selectedGrades}
          minConfidence={minConfidence}
          onGradesChange={setSelectedGrades}
          onMinConfidenceChange={setMinConfidence}
        />
        <div className="flex-1 bg-white">
          {isLoading ? (
            <div className="text-center text-slate-400 py-16">Loading...</div>
          ) : (
            <BrowseTable
              services={filtered}
              onAddToCompare={handleAddToCompare}
              canAddToCompare={(s) => canAdd(s.service_type)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
