import { getGrade, isStale, hasDivergence, getDivergingPillars, PILLAR_KEYS } from "@/lib/scoring";
import type { PillarBreakdown } from "@/lib/types";

const basePillars: PillarBreakdown = {
  transparency: 800,
  reliability: 800,
  security: 800,
  privacy: 800,
  safety_societal: 800,
  excessive_agency: 800,
};

describe("getGrade", () => {
  it("returns A for 900+", () => expect(getGrade(900)).toBe("A"));
  it("returns A for 1000", () => expect(getGrade(1000)).toBe("A"));
  it("returns B for 800–899", () => {
    expect(getGrade(800)).toBe("B");
    expect(getGrade(899)).toBe("B");
  });
  it("returns C for 700–799", () => {
    expect(getGrade(700)).toBe("C");
    expect(getGrade(799)).toBe("C");
  });
  it("returns D for 600–699", () => expect(getGrade(650)).toBe("D"));
  it("returns F for below 600", () => {
    expect(getGrade(599)).toBe("F");
    expect(getGrade(0)).toBe("F");
  });
});

describe("isStale", () => {
  it("returns false for null", () => expect(isStale(null)).toBe(false));
  it("returns false for recent date", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(isStale(yesterday)).toBe(false);
  });
  it("returns true for date older than 90 days", () => {
    const old = new Date(Date.now() - 91 * 86400000).toISOString();
    expect(isStale(old)).toBe(true);
  });
  it("returns false for exactly 90 days ago", () => {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    expect(isStale(cutoff)).toBe(false);
  });
});

describe("hasDivergence", () => {
  it("returns false when all pillars match", () => {
    expect(hasDivergence(basePillars, basePillars)).toBe(false);
  });
  it("returns false when difference is 99", () => {
    const scanner = { ...basePillars, security: 701 };
    expect(hasDivergence(scanner, basePillars)).toBe(false);
  });
  it("returns true when any pillar differs by exactly 100", () => {
    const scanner = { ...basePillars, security: 700 };
    expect(hasDivergence(scanner, basePillars)).toBe(true);
  });
  it("returns true when any pillar differs by more than 100", () => {
    const scanner = { ...basePillars, privacy: 500 };
    expect(hasDivergence(scanner, basePillars)).toBe(true);
  });
});

describe("getDivergingPillars", () => {
  it("returns only the diverging pillar keys", () => {
    const scanner = { ...basePillars, security: 600, privacy: 600 };
    const diverging = getDivergingPillars(scanner, basePillars);
    expect(diverging).toEqual(expect.arrayContaining(["security", "privacy"]));
    expect(diverging).not.toContain("transparency");
  });
});
