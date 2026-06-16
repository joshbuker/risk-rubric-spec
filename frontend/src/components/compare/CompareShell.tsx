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
      <div className="text-center py-24">
        <p className="text-slate-400 text-sm mb-4">No services in your comparison yet.</p>
        <Link href="/browse" className="text-blue-600 font-semibold hover:underline text-sm">
          ← Browse services to add
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {items.map((i) => (
        <ServiceLoader key={i.id} id={i.id} onLoaded={handleLoaded} />
      ))}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Compare Services</h1>
          <div className="flex items-center gap-2 mt-1">
            {lockedType && <TypeChip type={lockedType} />}
            <span className="text-sm text-slate-500">
              {items.length} of 4 max
            </span>
          </div>
        </div>
        <button
          onClick={clear}
          className="text-sm text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg"
        >
          Clear all
        </button>
      </div>

      {services.length > 0 && (
        <CompareGrid services={services} onRemove={remove} />
      )}

      <div className="flex items-center justify-between mt-5">
        <Link href="/browse" className="text-sm text-blue-600 font-medium hover:underline">
          ← Back to Browse
        </Link>
      </div>
    </div>
  );
}
