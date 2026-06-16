import type { Grade, PillarBreakdown } from "@/lib/types";

export const PILLAR_WEIGHTS: Record<keyof PillarBreakdown, number> = {
  transparency: 0.16,
  reliability: 0.16,
  security: 0.20,
  privacy: 0.16,
  safety_societal: 0.16,
  excessive_agency: 0.16,
};

export const PILLAR_LABELS: Record<keyof PillarBreakdown, string> = {
  transparency: "Transparency",
  reliability: "Reliability",
  security: "Security",
  privacy: "Privacy",
  safety_societal: "Safety & Societal Impacts",
  excessive_agency: "Excessive Agency",
};

export const PILLAR_KEYS = Object.keys(PILLAR_WEIGHTS) as (keyof PillarBreakdown)[];

export function getGrade(score: number): Grade {
  if (score >= 900) return "A";
  if (score >= 800) return "B";
  if (score >= 700) return "C";
  if (score >= 600) return "D";
  return "F";
}

export function isStale(scoredAt: string | null, thresholdDays = 90): boolean {
  if (!scoredAt) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  return new Date(scoredAt) < cutoff;
}

export function hasDivergence(
  scanner: PillarBreakdown,
  aggregate: PillarBreakdown
): boolean {
  return PILLAR_KEYS.some((k) => Math.abs(scanner[k] - aggregate[k]) >= 100);
}

export function getDivergingPillars(
  scanner: PillarBreakdown,
  aggregate: PillarBreakdown
): (keyof PillarBreakdown)[] {
  return PILLAR_KEYS.filter((k) => Math.abs(scanner[k] - aggregate[k]) >= 100);
}
