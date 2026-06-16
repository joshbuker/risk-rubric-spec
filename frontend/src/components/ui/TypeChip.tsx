import type { ServiceType } from "@/lib/types";

const TYPE_CONFIG: Record<ServiceType, { label: string; className: string }> = {
  ai_model: {
    label: "🧠 AI Model",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  mcp_server: {
    label: "🔌 MCP Server",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  agent: {
    label: "🤖 AI Agent",
    className: "bg-slate-50 text-slate-700 border border-slate-200",
  },
};

export function TypeChip({ type }: { type: ServiceType }) {
  const { label, className } = TYPE_CONFIG[type];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
