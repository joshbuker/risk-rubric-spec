"use client";
import type { ServiceType } from "@/lib/types";

interface Props {
  active: ServiceType;
  counts: Record<ServiceType, number>;
  onChange: (type: ServiceType) => void;
}

const TABS: { type: ServiceType; label: string }[] = [
  { type: "ai_model",   label: "AI Models" },
  { type: "mcp_server", label: "MCP Servers" },
];

export function TypeTabs({ active, counts, onChange }: Props) {
  return (
    <div className="flex border-b border-slate-200 bg-white px-6">
      {TABS.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === type
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {label}
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
            active === type ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
          }`}>
            {counts[type] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
