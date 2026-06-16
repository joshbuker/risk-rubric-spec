export type ServiceType = "ai_model" | "mcp_server" | "agent";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type ProviderTier = "official" | "platform_bundled" | "third_party";

export interface PillarBreakdown {
  transparency: number;
  reliability: number;
  security: number;
  privacy: number;
  safety_societal: number;
  excessive_agency: number;
}

export interface ScannerScore {
  scanner_id: string;
  scanner_name: string;
  composite_score: number;
  pillars: PillarBreakdown;
  scored_at: string;
  evidence: { label: string; url: string }[];
}

export interface ServiceListItem {
  id: string;
  name: string;
  slug: string;
  service_type: ServiceType;
  composite_score: number | null;
  grade: Grade | null;
  confidence: number;
  is_stale: boolean;
  scored_at: string | null;
  // Provider detail (for subtitle + sidebar filters); optional for backward-compat
  engine_provider?: string | null;
  platform_provider?: string | null;
  provider_org?: string | null;
  target_service?: string | null;
  // Aggregate pillar scores (for per-column grade badges)
  pillar_scores?: PillarBreakdown | null;
}

export interface ServiceDetail extends ServiceListItem {
  pillars: PillarBreakdown | null;
  scanners: ScannerScore[];
}
