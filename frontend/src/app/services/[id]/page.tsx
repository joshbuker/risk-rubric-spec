"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useService } from "@/hooks/useService";
import { useCompare } from "@/hooks/useCompare";
import { ServiceHero } from "@/components/detail/ServiceHero";
import { PillarBreakdown } from "@/components/detail/PillarBreakdown";
import { ScannerAccordion } from "@/components/detail/ScannerAccordion";
import { StaleBanner } from "@/components/ui/StaleBanner";

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: service, isLoading, error } = useService(id);
  const { add, canAdd } = useCompare();

  if (isLoading) return <div className="text-center py-16 text-slate-400">Loading…</div>;
  if (error || !service) return <div className="text-center py-16 text-red-500">Service not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {service.is_stale && <StaleBanner />}
      <ServiceHero service={service} />

      {service.pillars && <PillarBreakdown pillars={service.pillars} />}

      {service.scanners.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
          <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-4">
            Scanner Results
          </h2>
          {service.scanners.map((scanner) => (
            <ScannerAccordion
              key={scanner.scanner_id}
              scanner={scanner}
              aggregatePillars={service.pillars!}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4">
        <Link href="/browse" className="text-sm text-blue-600 font-medium hover:underline">
          ← Back to Browse
        </Link>
        <button
          onClick={() => add({ id: service.id, service_type: service.service_type, name: service.name })}
          disabled={!canAdd(service.service_type)}
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add to Compare
        </button>
      </div>
    </div>
  );
}
