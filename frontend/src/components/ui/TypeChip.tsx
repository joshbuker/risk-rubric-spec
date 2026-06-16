import type { ServiceType } from "@/lib/types";

const TYPE_CONFIG: Record<ServiceType, { label: string; className: string }> = {
  ai_model: {
    label: "🧠 AI Model",
    className: "bg-[#1f3c6b] text-[#79c0ff] border border-[#1f6feb]",
  },
  mcp_server: {
    label: "🔌 MCP Server",
    className: "bg-[#2d1f5e] text-[#d2a8ff] border border-[#8957e5]",
  },
  agent: {
    label: "🤖 AI Agent",
    className: "bg-[#21262d] text-[#c9d1d9] border border-[#30363d]",
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
