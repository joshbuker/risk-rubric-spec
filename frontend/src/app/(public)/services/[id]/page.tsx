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

  if (isLoading) return <div className="bg-[#0d1117] min-h-screen text-center py-16 text-[#8b949e]">Loading…</div>;
  if (error || !service) return <div className="bg-[#0d1117] min-h-screen text-center py-16 text-[#f85149]">Service not found.</div>;

  const typeLabel = service.service_type === "ai_model" ? "AI Models" : service.service_type === "mcp_server" ? "MCP Servers" : "Agents";

  return (
    <div className="bg-[#0d1117] min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-[#30363d] px-6 py-2 text-[13px] text-[#8b949e]">
        <Link href="/browse" className="text-[#79c0ff] hover:underline">Browse</Link>
        {" "}›{" "}
        <Link href={`/browse`} className="text-[#79c0ff] hover:underline">{typeLabel}</Link>
        {" "}›{" "}
        <span className="text-[#c9d1d9]">{service.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {service.is_stale && <StaleBanner />}
        <ServiceHero service={service} />

        {service.pillars && (
          <PillarBreakdown pillars={service.pillars} scannerCount={service.confidence} />
        )}

        {service.scanners.length > 0 && (
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 mb-5">
            <h2 className="text-[13px] font-bold uppercase text-[#8b949e] tracking-[0.5px] mb-4">
              Per-Scanner Breakdown
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

        {/* Compare CTA */}
        <div className="flex items-center justify-between bg-[#161b22] rounded-xl border border-[#30363d] px-6 py-4">
          <p className="text-[14px] text-[#8b949e]">
            <strong className="text-[#c9d1d9]">Compare this service</strong> with others side-by-side across all six pillars.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/browse"
              className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:border-[#8b949e]"
            >
              ↩ Back to Browse
            </Link>
            <button
              onClick={() => add({ id: service.id, service_type: service.service_type, name: service.name })}
              disabled={!canAdd(service.service_type)}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#1f6feb] text-white hover:bg-[#388bfd] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ＋ Add to Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
