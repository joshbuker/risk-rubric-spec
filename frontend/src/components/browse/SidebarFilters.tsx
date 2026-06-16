"use client";
import type { Grade, ServiceListItem, ServiceType } from "@/lib/types";

export type ConfidenceTier = "1" | "2" | "3+";

const GRADES: Grade[] = ["A", "B", "C", "D", "F"];

const DARK_GRADE_ACTIVE: Record<Grade, string> = {
  A: "bg-[#1a472a] text-[#56d364] border-[#56d364]",
  B: "bg-[#1c3a1c] text-[#56d364] border-[#56d364]",
  C: "bg-[#2d2a1a] text-[#ffa657] border-[#ffa657]",
  D: "bg-[#2d1f1a] text-[#f0883e] border-[#f0883e]",
  F: "bg-[#2d1a1a] text-[#f85149] border-[#f85149]",
};

const CONFIDENCE_TIERS: { value: ConfidenceTier; label: string }[] = [
  { value: "1",  label: "1 scanner"  },
  { value: "2",  label: "2 scanners" },
  { value: "3+", label: "3+ scanners" },
];

interface Props {
  activeTab: ServiceType;
  services: ServiceListItem[];
  selectedGrades: Grade[];
  confidenceTiers: Set<ConfidenceTier>;
  excludedProviders: Set<string>;
  excludedPlatforms: Set<string>;
  onGradesChange: (grades: Grade[]) => void;
  onConfidenceTiersChange: (tiers: Set<ConfidenceTier>) => void;
  onExcludedProvidersChange: (s: Set<string>) => void;
  onExcludedPlatformsChange: (s: Set<string>) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[1px] text-[#8b949e] mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function DarkCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#8b949e] hover:text-[#c9d1d9]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#79c0ff]"
      />
      {label}
    </label>
  );
}

export function SidebarFilters({
  activeTab,
  services,
  selectedGrades,
  confidenceTiers,
  excludedProviders,
  excludedPlatforms,
  onGradesChange,
  onConfidenceTiersChange,
  onExcludedProvidersChange,
  onExcludedPlatformsChange,
}: Props) {
  function toggleGrade(g: Grade) {
    onGradesChange(
      selectedGrades.includes(g) ? selectedGrades.filter((x) => x !== g) : [...selectedGrades, g]
    );
  }

  function toggleTier(tier: ConfidenceTier) {
    const next = new Set(confidenceTiers);
    next.has(tier) ? next.delete(tier) : next.add(tier);
    onConfidenceTiersChange(next);
  }

  function toggleProvider(p: string) {
    const next = new Set(excludedProviders);
    next.has(p) ? next.delete(p) : next.add(p);
    onExcludedProvidersChange(next);
  }

  function togglePlatform(p: string) {
    const next = new Set(excludedPlatforms);
    next.has(p) ? next.delete(p) : next.add(p);
    onExcludedPlatformsChange(next);
  }

  // Derive available providers/platforms from loaded services for this tab
  const aiModels = services.filter((s) => s.service_type === "ai_model");
  const availableProviders = [...new Set(aiModels.map((s) => s.engine_provider).filter(Boolean) as string[])].sort();
  const availablePlatforms = [...new Set(aiModels.map((s) => s.platform_provider ?? "Direct API"))].sort();

  return (
    <aside className="w-[190px] shrink-0 bg-[#161b22] border-r border-[#30363d] p-4 flex flex-col gap-[18px]">
      <Section title="Grade">
        <div className="flex gap-[5px]">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className={`px-[7px] py-[3px] rounded text-[12px] font-bold border-2 transition-colors ${
                selectedGrades.includes(g)
                  ? DARK_GRADE_ACTIVE[g]
                  : "bg-[#0d1117] text-[#8b949e] border-[#30363d]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Confidence">
        <div className="flex flex-col gap-[5px]">
          {CONFIDENCE_TIERS.map(({ value, label }) => (
            <DarkCheckbox
              key={value}
              checked={confidenceTiers.has(value)}
              onChange={() => toggleTier(value)}
              label={label}
            />
          ))}
        </div>
      </Section>

      {activeTab === "ai_model" && availableProviders.length > 0 && (
        <Section title="Engine Provider">
          <div className="flex flex-col gap-[5px]">
            {availableProviders.map((p) => (
              <DarkCheckbox
                key={p}
                checked={!excludedProviders.has(p)}
                onChange={() => toggleProvider(p)}
                label={p}
              />
            ))}
          </div>
        </Section>
      )}

      {activeTab === "ai_model" && availablePlatforms.length > 0 && (
        <Section title="Platform">
          <div className="flex flex-col gap-[5px]">
            {availablePlatforms.map((p) => (
              <DarkCheckbox
                key={p}
                checked={!excludedPlatforms.has(p)}
                onChange={() => togglePlatform(p)}
                label={p}
              />
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}
