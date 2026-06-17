"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useCompare } from "@/hooks/useCompare";
import { useService } from "@/hooks/useService";
import { CompareGrid } from "./CompareGrid";
import { TypeChip } from "@/components/ui/TypeChip";
import type { ServiceDetail } from "@/lib/types";

function ServiceLoader({
  id,
  onLoaded,
}: {
  id: string;
  onLoaded: (s: ServiceDetail) => void;
}) {
  const { data } = useService(id);
  if (data) onLoaded(data);
  return null;
}

export function CompareShell() {
  const { items, remove, clear, lockedType } = useCompare();
  const [loaded, setLoaded] = useState<Record<string, ServiceDetail>>({});

  const handleLoaded = useCallback((s: ServiceDetail) => {
    setLoaded((prev) => (prev[s.id] === s ? prev : { ...prev, [s.id]: s }));
  }, []);

  const services = items.map((i) => loaded[i.id]).filter(Boolean) as ServiceDetail[];

  if (items.length === 0) {
    return (
      <div className="bg-[#0d1117] min-h-screen text-center py-24">
        <p className="text-[#8b949e] text-sm mb-4">No services in your comparison yet.</p>
        <Link href="/browse" className="text-[#79c0ff] font-semibold hover:underline text-sm">
          ← Browse services to add
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] min-h-screen">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {items.map((i) => (
          <ServiceLoader key={i.id} id={i.id} onLoaded={handleLoaded} />
        ))}

        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#c9d1d9]">Compare Services</h1>
            <div className="flex items-center gap-2 mt-1">
              {lockedType && <TypeChip type={lockedType} />}
              <span className="text-[13px] text-[#8b949e]">
                Comparing {items.length} {items.length === 1 ? "service" : "services"}
                {items.length < 4 ? ` — ${4 - items.length} more can be added (max 4)` : " (max reached)"}
              </span>
            </div>
          </div>
          <button
            onClick={clear}
            className="text-sm text-[#8b949e] hover:text-[#f85149] border border-[#30363d] hover:border-[#f85149] px-3 py-1.5 rounded-lg"
          >
            Clear all
          </button>
        </div>

        {services.length > 0 && (
          <CompareGrid services={services} onRemove={remove} lockedType={lockedType} />
        )}

        <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-lg px-3.5 py-2.5 mt-4 text-[11px] text-[#8b949e]">
          <span>📝</span>
          <span>
            <strong className="text-[#c9d1d9]">▲ Best / ▼ Low</strong> highlights the highest and lowest score per pillar across the comparison set. Comparisons are locked to one service type — adding a service from Browse automatically sets the type for the whole set.
          </span>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Link href="/browse" className="text-[13px] text-[#79c0ff] font-medium hover:underline">
            ← Back to Browse
          </Link>
        </div>
      </div>
    </div>
  );
}
