"use client";
import type { ServiceType } from "@/lib/types";

interface Props {
  active: ServiceType;
  counts: Record<ServiceType, number>;
  onChange: (type: ServiceType) => void;
}

const TABS: { type: ServiceType; emoji: string; label: string }[] = [
  { type: "ai_model",   emoji: "🧠", label: "AI Models"   },
  { type: "mcp_server", emoji: "🔌", label: "MCP Servers" },
];

export function TypeTabs({ active, counts, onChange }: Props) {
  return (
    <div className="bg-[#161b22] border-b border-[#30363d] px-6 flex">
      {TABS.map(({ type, emoji, label }) => {
        const isActive = active === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              isActive
                ? "border-[#79c0ff] text-[#79c0ff]"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            {emoji} {label}
            <span className={`ml-1.5 text-[11px] px-[7px] py-[1px] rounded-full ${
              isActive
                ? "bg-[#79c0ff22] text-[#79c0ff]"
                : "bg-[#30363d] text-[#8b949e]"
            }`}>
              {counts[type] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
