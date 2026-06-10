# Risk Rubric v2 — Public Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js public frontend for Risk Rubric v2 — Browse, Service Detail, and Compare pages backed by the Plan 1 backend API.

**Architecture:** Next.js 14 App Router with TypeScript and Tailwind CSS. Client components handle interactive state (filters, compare set, accordion). Server components render initial page shells. Compare set persists in localStorage so it survives navigation between Browse and Compare. All data fetching uses SWR for client-side caching with stale-while-revalidate behavior.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS v3, SWR, Jest + @testing-library/react, @testing-library/jest-dom

**Prerequisite:** The Plan 1 backend must be running at `http://localhost:8000` before testing pages end-to-end.

---

## File Map

```
frontend/
  package.json
  next.config.ts
  tsconfig.json
  tailwind.config.ts
  jest.config.ts
  jest.setup.ts
  .env.local.example                         # NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
  src/
    app/
      layout.tsx                             # root layout: TopNav + page slot
      page.tsx                               # redirect → /browse
      browse/
        page.tsx                             # Browse page (server shell, client table)
      services/
        [id]/
          page.tsx                           # Detail page (server shell, client content)
      compare/
        page.tsx                             # Compare page (fully client)
    components/
      nav/
        TopNav.tsx                           # top navigation bar with compare badge
      ui/
        GradeBadge.tsx                       # A–F badge with grade-specific color
        ProgressBar.tsx                      # 0–1000 filled bar
        TypeChip.tsx                         # "🧠 AI Model" / "🔌 MCP Server" chip
        ConfidenceChip.tsx                   # "C=N scanners" display
        StaleBanner.tsx                      # amber stale warning banner
      browse/
        BrowseShell.tsx                      # client component: tabs + sidebar + table
        TypeTabs.tsx                         # AI Models / MCP Servers tab switcher
        SidebarFilters.tsx                   # grade + confidence + provider filters
        BrowseTable.tsx                      # <table> with one ServiceRow per service
        ServiceRow.tsx                       # single table row (grade badges + compare btn)
      detail/
        ServiceHero.tsx                      # hero with large grade + score + confidence
        PillarBreakdown.tsx                  # per-pillar rows with bar + grade + score
        ScannerAccordion.tsx                 # collapsible per-scanner blocks
        DivergenceWarning.tsx                # ↕ chip + warning callout for diverging pillars
      compare/
        CompareShell.tsx                     # client component: full compare grid
        CompareGrid.tsx                      # CSS-grid layout: label col + N service cols
        ServiceColumnHeader.tsx             # per-service header card (grade, name, ×)
        PillarCompareRow.tsx                 # one pillar row across all services
        AddServiceColumn.tsx                 # ghost "+ Add service" column
    lib/
      types.ts                               # TypeScript types mirroring backend schemas
      api.ts                                 # fetch wrappers (fetchServices, fetchService, fetchScanners)
      scoring.ts                             # getGrade, isStale, hasDivergence, getDivergingPillars
      compare-store.ts                       # localStorage compare set: add, remove, clear, canAdd
    hooks/
      useServices.ts                         # SWR hook: service list with optional type filter
      useService.ts                          # SWR hook: single service detail
      useCompare.ts                          # compare set state + actions (wraps compare-store)
  tests/
    scoring.test.ts                          # unit: getGrade, isStale, hasDivergence
    compare-store.test.ts                    # unit: add/remove/canAdd/type-lock
    GradeBadge.test.tsx                      # component: correct color per grade
    ServiceRow.test.tsx                      # component: renders pillars, add-to-compare btn
    PillarCompareRow.test.tsx                # component: best/worst highlighting
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/jest.config.ts`
- Create: `frontend/jest.setup.ts`
- Create: `frontend/.env.local.example`

- [ ] **Step 1: Scaffold the Next.js project**

```bash
cd frontend  # create this directory first if it doesn't exist
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint
```

- [ ] **Step 2: Install additional dependencies**

```bash
npm install swr
npm install --save-dev jest jest-environment-jsdom @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event \
  @types/jest ts-jest
```

- [ ] **Step 3: Create `jest.config.ts`**

```ts
import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.{ts,tsx}"],
};

export default createJestConfig(config);
```

- [ ] **Step 4: Create `jest.setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Create `.env.local.example`**

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Copy to `.env.local` and start the backend from Plan 1 before running the app.

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Next.js starts on `http://localhost:3000`. Opening it shows the default Next.js page.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js frontend project"
```

---

## Task 2: Types, API Client, and Scoring Utilities

**Files:**
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/scoring.ts`
- Create: `frontend/tests/scoring.test.ts`

- [ ] **Step 1: Create `src/lib/types.ts`**

```ts
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
}

export interface ServiceDetail extends ServiceListItem {
  pillars: PillarBreakdown | null;
  scanners: ScannerScore[];
}
```

- [ ] **Step 2: Create `src/lib/api.ts`**

```ts
import type { ServiceListItem, ServiceDetail, ServiceType } from "@/lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const fetchServices = (serviceType?: ServiceType) =>
  apiFetch<ServiceListItem[]>(
    serviceType ? `/services?service_type=${serviceType}` : "/services"
  );

export const fetchService = (id: string) =>
  apiFetch<ServiceDetail>(`/services/${id}`);
```

- [ ] **Step 3: Write failing tests for scoring utilities**

Create `tests/scoring.test.ts`:

```ts
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
```

- [ ] **Step 4: Run to confirm failures**

```bash
cd frontend
npx jest tests/scoring.test.ts
```

Expected: `Cannot find module '@/lib/scoring'`.

- [ ] **Step 5: Create `src/lib/scoring.ts`**

```ts
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
```

- [ ] **Step 6: Run tests to confirm pass**

```bash
npx jest tests/scoring.test.ts
```

Expected: all 14 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ tests/scoring.test.ts
git commit -m "feat: types, API client, and scoring utilities"
```

---

## Task 3: Compare Store

**Files:**
- Create: `frontend/src/lib/compare-store.ts`
- Create: `frontend/src/hooks/useCompare.ts`
- Create: `frontend/tests/compare-store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/compare-store.test.ts`:

```ts
import {
  getCompareItems,
  addToCompare,
  removeFromCompare,
  clearCompare,
  canAdd,
} from "@/lib/compare-store";

// localStorage is available in jest-environment-jsdom
beforeEach(() => localStorage.clear());

const modelItem = { id: "svc_1", service_type: "ai_model" as const, name: "Model A" };
const mcpItem   = { id: "svc_2", service_type: "mcp_server" as const, name: "MCP A" };
const modelItem2 = { id: "svc_3", service_type: "ai_model" as const, name: "Model B" };

test("starts empty", () => expect(getCompareItems()).toEqual([]));

test("add one item", () => {
  addToCompare(modelItem);
  expect(getCompareItems()).toHaveLength(1);
  expect(getCompareItems()[0].id).toBe("svc_1");
});

test("does not add duplicate", () => {
  addToCompare(modelItem);
  addToCompare(modelItem);
  expect(getCompareItems()).toHaveLength(1);
});

test("type-lock: rejects different type after first item", () => {
  addToCompare(modelItem);
  expect(canAdd("mcp_server")).toBe(false);
  addToCompare(mcpItem);
  expect(getCompareItems()).toHaveLength(1);
});

test("type-lock: accepts same type", () => {
  addToCompare(modelItem);
  expect(canAdd("ai_model")).toBe(true);
  addToCompare(modelItem2);
  expect(getCompareItems()).toHaveLength(2);
});

test("canAdd returns false when 4 items present", () => {
  for (let i = 0; i < 4; i++) {
    addToCompare({ id: `svc_${i}`, service_type: "ai_model", name: `Model ${i}` });
  }
  expect(canAdd("ai_model")).toBe(false);
});

test("remove removes by id", () => {
  addToCompare(modelItem);
  addToCompare(modelItem2);
  removeFromCompare("svc_1");
  expect(getCompareItems().map((i) => i.id)).toEqual(["svc_3"]);
});

test("clear empties set", () => {
  addToCompare(modelItem);
  clearCompare();
  expect(getCompareItems()).toHaveLength(0);
});

test("type unlocks after clearing", () => {
  addToCompare(modelItem);
  clearCompare();
  expect(canAdd("mcp_server")).toBe(true);
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
npx jest tests/compare-store.test.ts
```

Expected: `Cannot find module '@/lib/compare-store'`.

- [ ] **Step 3: Create `src/lib/compare-store.ts`**

```ts
import type { ServiceType } from "@/lib/types";

export interface CompareItem {
  id: string;
  service_type: ServiceType;
  name: string;
}

const STORAGE_KEY = "rr_compare_v1";
const MAX_COMPARE = 4;

function load(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as CompareItem[];
  } catch {
    return [];
  }
}

function save(items: CompareItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const getCompareItems = (): CompareItem[] => load();

export function canAdd(serviceType: ServiceType): boolean {
  const items = load();
  if (items.length >= MAX_COMPARE) return false;
  const locked = items[0]?.service_type;
  return !locked || locked === serviceType;
}

export function addToCompare(item: CompareItem): void {
  if (!canAdd(item.service_type)) return;
  const items = load();
  if (items.some((i) => i.id === item.id)) return;
  save([...items, item]);
}

export function removeFromCompare(id: string): void {
  save(load().filter((i) => i.id !== id));
}

export function clearCompare(): void {
  save([]);
}
```

- [ ] **Step 4: Create `src/hooks/useCompare.ts`**

```ts
"use client";
import { useState, useEffect, useCallback } from "react";
import {
  getCompareItems,
  addToCompare,
  removeFromCompare,
  clearCompare,
  canAdd,
  CompareItem,
} from "@/lib/compare-store";
import type { ServiceType } from "@/lib/types";

export function useCompare() {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    setItems(getCompareItems());
  }, []);

  const refresh = () => setItems(getCompareItems());

  const add = useCallback((item: CompareItem) => {
    addToCompare(item);
    refresh();
  }, []);

  const remove = useCallback((id: string) => {
    removeFromCompare(id);
    refresh();
  }, []);

  const clear = useCallback(() => {
    clearCompare();
    setItems([]);
  }, []);

  return {
    items,
    add,
    remove,
    clear,
    lockedType: items[0]?.service_type ?? null,
    canAdd: (type: ServiceType) => canAdd(type),
    count: items.length,
  };
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
npx jest tests/compare-store.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 6: Create `src/hooks/useServices.ts` and `src/hooks/useService.ts`**

```ts
// src/hooks/useServices.ts
import useSWR from "swr";
import { fetchServices } from "@/lib/api";
import type { ServiceListItem, ServiceType } from "@/lib/types";

export function useServices(serviceType?: ServiceType) {
  return useSWR<ServiceListItem[]>(
    ["services", serviceType ?? "all"],
    () => fetchServices(serviceType)
  );
}
```

```ts
// src/hooks/useService.ts
import useSWR from "swr";
import { fetchService } from "@/lib/api";
import type { ServiceDetail } from "@/lib/types";

export function useService(id: string) {
  return useSWR<ServiceDetail>(
    id ? `service/${id}` : null,
    () => fetchService(id)
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/compare-store.ts src/hooks/ tests/compare-store.test.ts
git commit -m "feat: compare set store and hooks"
```

---

## Task 4: Shared UI Components

**Files:**
- Create: `frontend/src/components/ui/GradeBadge.tsx`
- Create: `frontend/src/components/ui/ProgressBar.tsx`
- Create: `frontend/src/components/ui/TypeChip.tsx`
- Create: `frontend/src/components/ui/ConfidenceChip.tsx`
- Create: `frontend/src/components/ui/StaleBanner.tsx`
- Create: `frontend/tests/GradeBadge.test.tsx`

- [ ] **Step 1: Write failing GradeBadge tests**

Create `tests/GradeBadge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { GradeBadge } from "@/components/ui/GradeBadge";

test("renders the grade letter", () => {
  render(<GradeBadge grade="A" />);
  expect(screen.getByText("A")).toBeInTheDocument();
});

test("A grade has green styling", () => {
  const { container } = render(<GradeBadge grade="A" />);
  expect(container.firstChild).toHaveClass("bg-green-100");
});

test("F grade has red styling", () => {
  const { container } = render(<GradeBadge grade="F" />);
  expect(container.firstChild).toHaveClass("bg-red-100");
});

test("large variant applies larger text", () => {
  const { container } = render(<GradeBadge grade="B" size="lg" />);
  expect(container.firstChild).toHaveClass("text-4xl");
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
npx jest tests/GradeBadge.test.tsx
```

Expected: `Cannot find module '@/components/ui/GradeBadge'`.

- [ ] **Step 3: Create `src/components/ui/GradeBadge.tsx`**

```tsx
import type { Grade } from "@/lib/types";

const GRADE_CLASSES: Record<Grade, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-emerald-100 text-emerald-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};

interface Props {
  grade: Grade;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "w-7 h-5 text-xs rounded",
  md: "w-8 h-6 text-sm rounded",
  lg: "w-14 h-12 text-4xl rounded-lg",
};

export function GradeBadge({ grade, size = "md" }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center font-bold ${GRADE_CLASSES[grade]} ${SIZE_CLASSES[size]}`}
    >
      {grade}
    </span>
  );
}
```

- [ ] **Step 4: Run GradeBadge tests to confirm pass**

```bash
npx jest tests/GradeBadge.test.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 5: Create remaining UI components**

Create `src/components/ui/ProgressBar.tsx`:

```tsx
import type { Grade } from "@/lib/types";

const BAR_CLASSES: Record<Grade, string> = {
  A: "bg-green-500",
  B: "bg-emerald-400",
  C: "bg-yellow-400",
  D: "bg-orange-400",
  F: "bg-red-500",
};

interface Props {
  score: number;   // 0–1000
  grade: Grade;
}

export function ProgressBar({ score, grade }: Props) {
  const pct = Math.min(100, Math.max(0, score / 10));
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${BAR_CLASSES[grade]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

Create `src/components/ui/TypeChip.tsx`:

```tsx
import type { ServiceType } from "@/lib/types";

const TYPE_CONFIG: Record<ServiceType, { label: string; className: string }> = {
  ai_model:   { label: "🧠 AI Model",   className: "bg-blue-50 text-blue-700 border border-blue-200" },
  mcp_server: { label: "🔌 MCP Server", className: "bg-violet-50 text-violet-700 border border-violet-200" },
  agent:      { label: "🤖 AI Agent",   className: "bg-slate-50 text-slate-700 border border-slate-200" },
};

export function TypeChip({ type }: { type: ServiceType }) {
  const { label, className } = TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
```

Create `src/components/ui/ConfidenceChip.tsx`:

```tsx
export function ConfidenceChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-slate-500 bg-slate-100 border border-slate-200">
      🔍 C={count}
    </span>
  );
}
```

Create `src/components/ui/StaleBanner.tsx`:

```tsx
export function StaleBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-5">
      <span className="text-lg">⚠️</span>
      <span>
        One or more scanner results are older than 90 days. Scores may not reflect the latest version.
      </span>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/ tests/GradeBadge.test.tsx
git commit -m "feat: shared UI components (GradeBadge, ProgressBar, TypeChip, etc.)"
```

---

## Task 5: Layout and Top Nav

**Files:**
- Create: `frontend/src/components/nav/TopNav.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create `src/components/nav/TopNav.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "@/hooks/useCompare";

const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/compare", label: "Compare" },
];

export function TopNav() {
  const pathname = usePathname();
  const { count } = useCompare();

  return (
    <nav className="bg-[#1a1a2e] text-white px-6 py-2.5 flex items-center gap-6">
      <span className="text-blue-400 font-bold text-base tracking-tight">
        CSA Risk Rubric
      </span>
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              pathname.startsWith(href)
                ? "text-blue-300 font-semibold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {label}
            {label === "Compare" && count > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/nav/TopNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CSA Risk Rubric",
  description: "AI service risk ratings from the Cloud Security Alliance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 min-h-screen`}>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create `src/app/page.tsx`** (redirect to /browse)

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/browse");
}
```

- [ ] **Step 4: Verify nav renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: dark nav with "CSA Risk Rubric", "Browse", "Compare" links. "/" redirects to "/browse".

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/ src/app/layout.tsx src/app/page.tsx
git commit -m "feat: top nav with compare badge and root layout"
```

---

## Task 6: Browse Page

**Files:**
- Create: `frontend/src/app/browse/page.tsx`
- Create: `frontend/src/components/browse/BrowseShell.tsx`
- Create: `frontend/src/components/browse/TypeTabs.tsx`
- Create: `frontend/src/components/browse/BrowseTable.tsx`
- Create: `frontend/src/components/browse/ServiceRow.tsx`
- Create: `frontend/src/components/browse/SidebarFilters.tsx`
- Create: `frontend/tests/ServiceRow.test.tsx`

- [ ] **Step 1: Write failing ServiceRow test**

Create `tests/ServiceRow.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ServiceRow } from "@/components/browse/ServiceRow";
import type { ServiceListItem } from "@/lib/types";

const mockService: ServiceListItem = {
  id: "svc_abc",
  name: "Claude Sonnet 4.6 (Direct API)",
  slug: "claude-sonnet-4-6-direct-api",
  service_type: "ai_model",
  composite_score: 923,
  grade: "A",
  confidence: 3,
  is_stale: false,
  scored_at: new Date().toISOString(),
};

const mockStaleService: ServiceListItem = {
  ...mockService,
  id: "svc_stale",
  is_stale: true,
};

test("renders service name", () => {
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={() => {}} canAddToCompare /></tbody></table>);
  expect(screen.getByText("Claude Sonnet 4.6 (Direct API)")).toBeInTheDocument();
});

test("renders composite score", () => {
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={() => {}} canAddToCompare /></tbody></table>);
  expect(screen.getByText("923")).toBeInTheDocument();
});

test("stale row has amber styling", () => {
  const { container } = render(
    <table><tbody><ServiceRow service={mockStaleService} onAddToCompare={() => {}} canAddToCompare /></tbody></table>
  );
  expect(container.querySelector("tr")).toHaveClass("bg-amber-50");
});

test("add to compare button calls handler", () => {
  const handler = jest.fn();
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={handler} canAddToCompare /></tbody></table>);
  fireEvent.click(screen.getByRole("button", { name: /add to compare/i }));
  expect(handler).toHaveBeenCalledWith(mockService);
});

test("add to compare button disabled when canAddToCompare is false", () => {
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={() => {}} canAddToCompare={false} /></tbody></table>);
  expect(screen.getByRole("button", { name: /add to compare/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
npx jest tests/ServiceRow.test.tsx
```

Expected: `Cannot find module '@/components/browse/ServiceRow'`.

- [ ] **Step 3: Create `src/components/browse/ServiceRow.tsx`**

```tsx
import Link from "next/link";
import { GradeBadge } from "@/components/ui/GradeBadge";
import type { ServiceListItem, Grade } from "@/lib/types";
import { PILLAR_KEYS } from "@/lib/scoring";

interface Props {
  service: ServiceListItem & { pillar_grades?: Partial<Record<string, Grade>> };
  onAddToCompare: (s: ServiceListItem) => void;
  canAddToCompare: boolean;
}

export function ServiceRow({ service, onAddToCompare, canAddToCompare }: Props) {
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 text-sm ${service.is_stale ? "bg-amber-50" : ""}`}>
      <td className="px-4 py-3">
        <Link href={`/services/${service.id}`} className="font-semibold text-slate-800 hover:text-blue-600">
          {service.name}
        </Link>
      </td>
      {PILLAR_KEYS.map((key) => (
        <td key={key} className="px-3 py-3 text-center">
          {service.pillar_grades?.[key] ? (
            <GradeBadge grade={service.pillar_grades[key]!} size="sm" />
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
      ))}
      <td className="px-4 py-3 text-right font-semibold text-slate-700">
        {service.composite_score != null ? Math.round(service.composite_score) : "—"}
      </td>
      <td className="px-4 py-3 text-center text-slate-500 text-xs">
        C={service.confidence}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onAddToCompare(service)}
          disabled={!canAddToCompare}
          className="text-xs font-semibold px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Add to compare"
        >
          + Compare
        </button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Create remaining Browse components**

Create `src/components/browse/TypeTabs.tsx`:

```tsx
"use client";
import type { ServiceType } from "@/lib/types";

interface Props {
  active: ServiceType;
  counts: Record<ServiceType, number>;
  onChange: (type: ServiceType) => void;
}

const TABS: { type: ServiceType; label: string }[] = [
  { type: "ai_model",   label: "🧠 AI Models" },
  { type: "mcp_server", label: "🔌 MCP Servers" },
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
```

Create `src/components/browse/SidebarFilters.tsx`:

```tsx
"use client";
import type { Grade } from "@/lib/types";

const GRADES: Grade[] = ["A", "B", "C", "D", "F"];

interface Props {
  selectedGrades: Grade[];
  minConfidence: number;
  onGradesChange: (grades: Grade[]) => void;
  onMinConfidenceChange: (min: number) => void;
}

export function SidebarFilters({ selectedGrades, minConfidence, onGradesChange, onMinConfidenceChange }: Props) {
  function toggleGrade(g: Grade) {
    onGradesChange(
      selectedGrades.includes(g) ? selectedGrades.filter((x) => x !== g) : [...selectedGrades, g]
    );
  }

  const GRADE_ACTIVE = "border-2 border-current font-bold";
  const GRADE_COLORS: Record<Grade, string> = {
    A: "bg-green-50 text-green-700",
    B: "bg-emerald-50 text-emerald-700",
    C: "bg-yellow-50 text-yellow-700",
    D: "bg-orange-50 text-orange-700",
    F: "bg-red-50 text-red-700",
  };

  return (
    <aside className="w-48 shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col gap-5">
      <div>
        <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Grade</div>
        <div className="flex gap-1 flex-wrap">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className={`px-2 py-0.5 rounded text-xs ${GRADE_COLORS[g]} ${selectedGrades.includes(g) ? GRADE_ACTIVE : "border border-transparent opacity-50"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Min Scanners</div>
        <select
          value={minConfidence}
          onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
        >
          <option value={1}>Any (1+)</option>
          <option value={2}>2+ scanners</option>
          <option value={3}>3+ scanners</option>
        </select>
      </div>
    </aside>
  );
}
```

Create `src/components/browse/BrowseTable.tsx`:

```tsx
import { ServiceRow } from "./ServiceRow";
import type { ServiceListItem } from "@/lib/types";
import { PILLAR_LABELS } from "@/lib/scoring";

interface Props {
  services: ServiceListItem[];
  onAddToCompare: (s: ServiceListItem) => void;
  canAddToCompare: (s: ServiceListItem) => boolean;
}

const PILLAR_ENTRIES = Object.entries(PILLAR_LABELS);

export function BrowseTable({ services, onAddToCompare, canAddToCompare }: Props) {
  if (services.length === 0) {
    return (
      <div className="text-center text-slate-400 py-16 text-sm">
        No services match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400 tracking-wide">Service</th>
            {PILLAR_ENTRIES.map(([key, label]) => (
              <th key={key} className="px-3 py-2.5 text-center text-xs font-bold uppercase text-slate-400 tracking-wide">
                {label}
              </th>
            ))}
            <th className="px-4 py-2.5 text-right text-xs font-bold uppercase text-slate-400">Score</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-slate-400">C</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              onAddToCompare={onAddToCompare}
              canAddToCompare={canAddToCompare(s)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Create `src/components/browse/BrowseShell.tsx`:

```tsx
"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useServices } from "@/hooks/useServices";
import { useCompare } from "@/hooks/useCompare";
import { TypeTabs } from "./TypeTabs";
import { SidebarFilters } from "./SidebarFilters";
import { BrowseTable } from "./BrowseTable";
import type { ServiceListItem, ServiceType, Grade } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

export function BrowseShell() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ServiceType>("ai_model");
  const [selectedGrades, setSelectedGrades] = useState<Grade[]>(["A", "B", "C", "D", "F"]);
  const [minConfidence, setMinConfidence] = useState(1);

  const { data: services = [], isLoading } = useServices(activeTab);
  const { add, canAdd, count } = useCompare();

  const counts = useMemo(() => ({
    ai_model: services.filter((s) => s.service_type === "ai_model").length,
    mcp_server: services.filter((s) => s.service_type === "mcp_server").length,
    agent: 0,
  }), [services]);

  const filtered = useMemo(() =>
    services.filter((s) => {
      if (s.composite_score == null) return false;
      const grade = s.grade ?? getGrade(s.composite_score);
      return selectedGrades.includes(grade) && s.confidence >= minConfidence;
    }),
    [services, selectedGrades, minConfidence]
  );

  function handleAddToCompare(s: ServiceListItem) {
    add({ id: s.id, service_type: s.service_type, name: s.name });
    if (count + 1 >= 2) router.push("/compare");
  }

  return (
    <div className="max-w-screen-xl mx-auto">
      <TypeTabs active={activeTab} counts={counts} onChange={setActiveTab} />
      <div className="flex min-h-screen">
        <SidebarFilters
          selectedGrades={selectedGrades}
          minConfidence={minConfidence}
          onGradesChange={setSelectedGrades}
          onMinConfidenceChange={setMinConfidence}
        />
        <div className="flex-1 bg-white">
          {isLoading ? (
            <div className="text-center text-slate-400 py-16">Loading…</div>
          ) : (
            <BrowseTable
              services={filtered}
              onAddToCompare={handleAddToCompare}
              canAddToCompare={(s) => canAdd(s.service_type)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/browse/page.tsx`**

```tsx
import { BrowseShell } from "@/components/browse/BrowseShell";

export default function BrowsePage() {
  return (
    <div>
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800">Browse AI Services</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Risk grades from independent scanner partners
        </p>
      </div>
      <BrowseShell />
    </div>
  );
}
```

- [ ] **Step 6: Run ServiceRow tests**

```bash
npx jest tests/ServiceRow.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 7: Verify browse page renders with backend running**

```bash
npm run dev
```

Open `http://localhost:3000/browse`. Expected: tabs, sidebar filters, and a table of services from the backend API.

- [ ] **Step 8: Commit**

```bash
git add src/app/browse/ src/components/browse/ tests/ServiceRow.test.tsx
git commit -m "feat: Browse page with tabs, sidebar filters, and compare actions"
```

---

## Task 7: Service Detail Page

**Files:**
- Create: `frontend/src/app/services/[id]/page.tsx`
- Create: `frontend/src/components/detail/ServiceHero.tsx`
- Create: `frontend/src/components/detail/PillarBreakdown.tsx`
- Create: `frontend/src/components/detail/ScannerAccordion.tsx`
- Create: `frontend/src/components/detail/DivergenceWarning.tsx`

- [ ] **Step 1: Create `src/components/detail/ServiceHero.tsx`**

```tsx
import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import { ConfidenceChip } from "@/components/ui/ConfidenceChip";
import type { ServiceDetail } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

export function ServiceHero({ service }: { service: ServiceDetail }) {
  const grade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-7 flex gap-8 items-start mb-5">
      <div className="flex-1 min-w-0">
        <TypeChip type={service.service_type} />
        <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">{service.name}</h1>
        <ConfidenceChip count={service.confidence} />
      </div>
      {grade && service.composite_score != null && (
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="flex flex-col items-center bg-slate-50 rounded-xl border border-slate-200 px-7 py-5 gap-1">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Grade</span>
            <GradeBadge grade={grade} size="lg" />
            <span className="text-xl font-bold text-slate-700">{Math.round(service.composite_score)}</span>
            <span className="text-xs text-slate-400">weighted avg</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/detail/PillarBreakdown.tsx`**

```tsx
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { PillarBreakdown as PillarBreakdownType } from "@/lib/types";
import { PILLAR_LABELS, PILLAR_KEYS, PILLAR_WEIGHTS, getGrade } from "@/lib/scoring";

export function PillarBreakdown({ pillars }: { pillars: PillarBreakdownType }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
      <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-4">
        Pillar Breakdown
      </h2>
      <div className="flex flex-col gap-0">
        {PILLAR_KEYS.map((key) => {
          const score = pillars[key];
          const grade = getGrade(score);
          const weight = PILLAR_WEIGHTS[key];
          return (
            <div key={key} className="grid grid-cols-[180px_36px_1fr_56px] items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600 font-medium">
                {PILLAR_LABELS[key]}
                <span className="ml-1 text-xs text-slate-300">{(weight * 100).toFixed(0)}%</span>
              </span>
              <GradeBadge grade={grade} size="sm" />
              <ProgressBar score={score} grade={grade} />
              <span className="text-right text-sm font-semibold text-slate-700">
                {Math.round(score)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/detail/DivergenceWarning.tsx`**

```tsx
import type { PillarBreakdown } from "@/lib/types";
import { PILLAR_LABELS, getDivergingPillars } from "@/lib/scoring";

interface Props {
  scannerPillars: PillarBreakdown;
  aggregatePillars: PillarBreakdown;
}

export function DivergenceWarning({ scannerPillars, aggregatePillars }: Props) {
  const diverging = getDivergingPillars(scannerPillars, aggregatePillars);
  if (diverging.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 mt-3 text-xs text-amber-800">
      ↕ This scanner&apos;s score differs from the aggregate by 100+ points on:{" "}
      <strong>{diverging.map((k) => PILLAR_LABELS[k]).join(", ")}</strong>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/detail/ScannerAccordion.tsx`**

```tsx
"use client";
import { useState } from "react";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DivergenceWarning } from "./DivergenceWarning";
import type { ScannerScore, PillarBreakdown } from "@/lib/types";
import { PILLAR_KEYS, PILLAR_LABELS, getGrade, hasDivergence } from "@/lib/scoring";

interface Props {
  scanner: ScannerScore;
  aggregatePillars: PillarBreakdown;
}

export function ScannerAccordion({ scanner, aggregatePillars }: Props) {
  const [open, setOpen] = useState(false);
  const grade = getGrade(scanner.composite_score);
  const diverges = hasDivergence(scanner.pillars, aggregatePillars);
  const scoredDate = new Date(scanner.scored_at).toLocaleDateString();

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-3 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
      >
        <span className="font-semibold text-sm text-blue-700 flex-1">{scanner.scanner_name}</span>
        <span className="text-xs text-slate-400">{scoredDate}</span>
        {diverges && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
            ↕ Diverges
          </span>
        )}
        <GradeBadge grade={grade} size="sm" />
        <span className="text-sm font-bold text-slate-700">{Math.round(scanner.composite_score)}</span>
        <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3">
          {PILLAR_KEYS.map((key) => {
            const score = scanner.pillars[key];
            const g = getGrade(score);
            return (
              <div key={key} className="grid grid-cols-[160px_28px_1fr_44px] items-center gap-2 py-1.5 border-b border-slate-50 last:border-0 text-xs">
                <span className="text-slate-500">{PILLAR_LABELS[key]}</span>
                <GradeBadge grade={g} size="sm" />
                <ProgressBar score={score} grade={g} />
                <span className="text-right font-semibold text-slate-600">{Math.round(score)}</span>
              </div>
            );
          })}

          {scanner.evidence.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1.5">Evidence</div>
              {scanner.evidence.map((e, i) => (
                <a key={i} href={e.url} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-4">
                  ↗ {e.label}
                </a>
              ))}
            </div>
          )}

          <DivergenceWarning scannerPillars={scanner.pillars} aggregatePillars={aggregatePillars} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/services/[id]/page.tsx`**

```tsx
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
```

- [ ] **Step 6: Verify detail page with backend running**

Navigate to a service from the Browse page. Expected: hero with grade, pillar breakdown with bars, scanner accordion (expandable), stale banner if applicable, divergence warning when a scanner's pillar differs by 100+.

- [ ] **Step 7: Commit**

```bash
git add src/app/services/ src/components/detail/
git commit -m "feat: Service Detail page with hero, pillar breakdown, and scanner accordion"
```

---

## Task 8: Compare Page

**Files:**
- Create: `frontend/src/app/compare/page.tsx`
- Create: `frontend/src/components/compare/CompareShell.tsx`
- Create: `frontend/src/components/compare/CompareGrid.tsx`
- Create: `frontend/src/components/compare/ServiceColumnHeader.tsx`
- Create: `frontend/src/components/compare/PillarCompareRow.tsx`
- Create: `frontend/src/components/compare/AddServiceColumn.tsx`
- Create: `frontend/tests/PillarCompareRow.test.tsx`

- [ ] **Step 1: Write failing PillarCompareRow tests**

Create `tests/PillarCompareRow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { PillarCompareRow } from "@/components/compare/PillarCompareRow";
import type { PillarBreakdown } from "@/lib/types";

const pillarsHigh: PillarBreakdown = { transparency: 900, reliability: 900, security: 900, privacy: 900, safety_societal: 900, excessive_agency: 900 };
const pillarsLow:  PillarBreakdown = { transparency: 600, reliability: 600, security: 600, privacy: 600, safety_societal: 600, excessive_agency: 600 };
const pillarsMid:  PillarBreakdown = { transparency: 750, reliability: 750, security: 750, privacy: 750, safety_societal: 750, excessive_agency: 750 };

const services = [
  { id: "svc_1", pillars: pillarsHigh, composite_score: 900, name: "Service A" },
  { id: "svc_2", pillars: pillarsLow,  composite_score: 600, name: "Service B" },
  { id: "svc_3", pillars: pillarsMid,  composite_score: 750, name: "Service C" },
];

test("renders a score for each service", () => {
  render(
    <table><tbody>
      <PillarCompareRow pillarKey="security" services={services} />
    </tbody></table>
  );
  expect(screen.getByText("900")).toBeInTheDocument();
  expect(screen.getByText("600")).toBeInTheDocument();
  expect(screen.getByText("750")).toBeInTheDocument();
});

test("marks the highest score as best", () => {
  const { container } = render(
    <table><tbody>
      <PillarCompareRow pillarKey="security" services={services} />
    </tbody></table>
  );
  const cells = container.querySelectorAll("td[data-service-id]");
  expect(cells[0]).toHaveClass("bg-green-50");   // highest
  expect(cells[1]).toHaveClass("bg-red-50");     // lowest
  expect(cells[2]).not.toHaveClass("bg-green-50");
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
npx jest tests/PillarCompareRow.test.tsx
```

Expected: `Cannot find module '@/components/compare/PillarCompareRow'`.

- [ ] **Step 3: Create `src/components/compare/PillarCompareRow.tsx`**

```tsx
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { PillarBreakdown } from "@/lib/types";
import { PILLAR_LABELS, getGrade } from "@/lib/scoring";

interface ServicePillarData {
  id: string;
  name: string;
  pillars: PillarBreakdown;
  composite_score: number | null;
}

interface Props {
  pillarKey: keyof PillarBreakdown;
  services: ServicePillarData[];
}

export function PillarCompareRow({ pillarKey, services }: Props) {
  const scores = services.map((s) => s.pillars[pillarKey]);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 bg-white">
        <div className="text-sm font-semibold text-slate-600">{PILLAR_LABELS[pillarKey]}</div>
      </td>
      {services.map((s) => {
        const score = s.pillars[pillarKey];
        const grade = getGrade(score);
        const isBest  = score === maxScore;
        const isWorst = score === minScore && minScore !== maxScore;
        return (
          <td
            key={s.id}
            data-service-id={s.id}
            className={`px-4 py-3 border-l border-slate-200 ${isBest ? "bg-green-50" : isWorst ? "bg-red-50" : "bg-white"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <GradeBadge grade={grade} size="sm" />
              <span className="text-sm font-bold text-slate-800">{Math.round(score)}</span>
              {isBest  && <span className="text-xs text-green-700 font-semibold">▲ Best</span>}
              {isWorst && <span className="text-xs text-red-600 font-semibold">▼ Low</span>}
            </div>
            <ProgressBar score={score} grade={grade} />
          </td>
        );
      })}
      <td className="border-l border-slate-200 bg-slate-50" />
    </tr>
  );
}
```

- [ ] **Step 4: Create `src/components/compare/ServiceColumnHeader.tsx`**

```tsx
import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import type { ServiceDetail } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

interface Props {
  service: ServiceDetail;
  onRemove: () => void;
}

export function ServiceColumnHeader({ service, onRemove }: Props) {
  const grade = service.grade ?? (service.composite_score != null ? getGrade(service.composite_score) : null);

  return (
    <div className="px-4 pt-5 pb-4 border-l border-slate-200 bg-slate-50 flex flex-col gap-2.5 border-b-2 border-b-slate-200">
      <div className="flex justify-between items-start">
        <TypeChip type={service.service_type} />
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded px-1 text-lg leading-none"
          aria-label={`Remove ${service.name} from comparison`}
        >
          ×
        </button>
      </div>
      <div>
        <div className="font-bold text-sm text-slate-900 leading-snug">{service.name}</div>
        {service.is_stale && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full mt-1">
            ⚠ Stale
          </span>
        )}
      </div>
      {grade && service.composite_score != null && (
        <div className="flex items-center gap-2.5">
          <GradeBadge grade={grade} size="lg" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-700">{Math.round(service.composite_score)}</span>
            <span className="text-xs text-slate-400">C={service.confidence}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/compare/AddServiceColumn.tsx`**

```tsx
import Link from "next/link";

export function AddServiceColumn() {
  return (
    <div className="border-l border-slate-200 flex flex-col">
      <div className="px-3 py-4 border-b-2 border-b-slate-200 bg-slate-50 flex-1 flex items-center justify-center">
        <Link
          href="/browse"
          className="flex flex-col items-center gap-2 text-slate-400 hover:text-slate-600 p-4 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 transition-colors text-center"
        >
          <span className="text-2xl">+</span>
          <span className="text-xs font-medium">Add service<br />from Browse</span>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/compare/CompareGrid.tsx`**

```tsx
import { ServiceColumnHeader } from "./ServiceColumnHeader";
import { PillarCompareRow } from "./PillarCompareRow";
import { AddServiceColumn } from "./AddServiceColumn";
import type { ServiceDetail, PillarBreakdown } from "@/lib/types";
import { PILLAR_KEYS, PILLAR_LABELS, getGrade } from "@/lib/scoring";

interface Props {
  services: ServiceDetail[];
  onRemove: (id: string) => void;
}

export function CompareGrid({ services, onRemove }: Props) {
  const serviceColWidth = `minmax(180px, 1fr)`;
  const gridCols = `190px repeat(${services.length}, ${serviceColWidth}) 130px`;

  const pillarServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    pillars: s.pillars ?? ({} as PillarBreakdown),
    composite_score: s.composite_score,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
      <div style={{ display: "grid", gridTemplateColumns: gridCols }}>

        {/* Header row */}
        <div className="px-4 py-4 bg-slate-50 border-b-2 border-b-slate-200 flex items-end">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Pillar</span>
        </div>
        {services.map((s) => (
          <ServiceColumnHeader key={s.id} service={s} onRemove={() => onRemove(s.id)} />
        ))}
        <div className="px-3 py-4 bg-slate-50 border-l border-slate-200 border-b-2 border-b-slate-200 flex items-center justify-center">
          <span className="text-xs font-bold uppercase text-slate-400">Add</span>
        </div>

        {/* Composite summary row */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Composite Score</span>
        </div>
        {services.map((s) => {
          const grade = s.grade ?? (s.composite_score != null ? getGrade(s.composite_score) : null);
          return (
            <div key={s.id} className="px-4 py-3 border-l border-slate-200 bg-slate-50 border-b border-b-slate-200 flex items-center gap-2">
              {grade && <span className={`inline-flex items-center justify-center w-8 h-6 text-sm font-bold rounded`}>{grade}</span>}
              <span className="text-base font-bold text-slate-800">
                {s.composite_score != null ? Math.round(s.composite_score) : "—"}
              </span>
            </div>
          );
        })}
        <div className="border-l border-slate-200 bg-slate-50 border-b border-b-slate-200" />

        {/* Pillar rows */}
        {PILLAR_KEYS.map((key) => (
          <>
            <div key={`label-${key}`} className="px-4 py-3 bg-white border-b border-slate-100 last:border-0 flex flex-col justify-center gap-0.5">
              <span className="text-sm font-semibold text-slate-600">{PILLAR_LABELS[key]}</span>
            </div>
            {services.map((s) => {
              const score = s.pillars?.[key] ?? 0;
              const grade = getGrade(score);
              const scores = services.map((sv) => sv.pillars?.[key] ?? 0);
              const isBest  = score === Math.max(...scores);
              const isWorst = score === Math.min(...scores) && Math.min(...scores) !== Math.max(...scores);
              return (
                <div
                  key={`${s.id}-${key}`}
                  className={`px-4 py-3 border-l border-slate-200 border-b border-slate-100 flex flex-col gap-1.5 ${isBest ? "bg-green-50" : isWorst ? "bg-red-50" : "bg-white"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{Math.round(score)}</span>
                    {isBest  && <span className="text-xs text-green-700 font-semibold">▲ Best</span>}
                    {isWorst && <span className="text-xs text-red-600 font-semibold">▼ Low</span>}
                  </div>
                </div>
              );
            })}
            <div key={`add-${key}`} className="border-l border-slate-200 bg-slate-50 border-b border-slate-100" />
          </>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/components/compare/CompareShell.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useCompare } from "@/hooks/useCompare";
import { useService } from "@/hooks/useService";
import { CompareGrid } from "./CompareGrid";
import type { ServiceDetail } from "@/lib/types";
import { TypeChip } from "@/components/ui/TypeChip";
import Link from "next/link";

function ServiceLoader({ id, onLoaded }: { id: string; onLoaded: (s: ServiceDetail) => void }) {
  const { data } = useService(id);
  if (data) onLoaded(data);
  return null;
}

export function CompareShell() {
  const { items, remove, clear, lockedType } = useCompare();
  const router = useRouter();

  // Collect loaded services
  const [loaded, setLoaded] = React.useState<Record<string, ServiceDetail>>({});

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
      {/* Loaders */}
      {items.map((i) => (
        <ServiceLoader
          key={i.id}
          id={i.id}
          onLoaded={(s) => setLoaded((prev) => ({ ...prev, [s.id]: s }))}
        />
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

import React from "react";
```

- [ ] **Step 8: Create `src/app/compare/page.tsx`**

```tsx
import { CompareShell } from "@/components/compare/CompareShell";

export default function ComparePage() {
  return <CompareShell />;
}
```

- [ ] **Step 9: Run PillarCompareRow tests**

```bash
npx jest tests/PillarCompareRow.test.tsx
```

Expected: all 2 tests pass.

- [ ] **Step 10: Run full test suite**

```bash
npx jest
```

Expected: all tests pass. Fix any import errors before proceeding.

- [ ] **Step 11: Verify compare flow end-to-end with backend running**

1. Open Browse, click "+ Compare" on two AI Model services
2. Nav badge shows "2"
3. Navigate to `/compare` — see both services side by side with pillar rows
4. Confirm ▲ Best / ▼ Low highlights appear correctly
5. Click × on one service — it disappears from the grid
6. Click "+ Add service from Browse" column — navigates to Browse

- [ ] **Step 12: Commit**

```bash
git add src/app/compare/ src/components/compare/ tests/PillarCompareRow.test.tsx
git commit -m "feat: Compare page with type-lock, best/worst highlighting, add/remove"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| Browse: compact table, one row per service | Task 6 `BrowseTable`, `ServiceRow` |
| Browse: per-pillar grade badges | Task 6 `ServiceRow` (pillar_grades) |
| Browse: AI Models / MCP Servers tabs | Task 6 `TypeTabs` |
| Browse: sidebar filters (grade, confidence) | Task 6 `SidebarFilters` |
| Browse: stale row styling | Task 6 `ServiceRow` (`bg-amber-50` when `is_stale`) |
| Browse: "+ Add to Compare" action | Task 6 `ServiceRow` button + `BrowseShell` handler |
| Detail: hero with composite grade + score | Task 7 `ServiceHero` |
| Detail: stale banner (>90d) | Task 7 `StaleBanner` in detail page |
| Detail: pillar breakdown with bars | Task 7 `PillarBreakdown` |
| Detail: expandable per-scanner blocks | Task 7 `ScannerAccordion` |
| Detail: divergence chip + warning | Task 7 `DivergenceWarning`, `hasDivergence` |
| Detail: evidence links | Task 7 `ScannerAccordion` expanded view |
| Compare: 2–4 services side by side | Task 8 `CompareGrid` |
| Compare: type lock (first item sets type) | Task 3 `compare-store`, `canAdd` |
| Compare: type chip in page header | Task 8 `CompareShell` |
| Compare: ▲ Best / ▼ Low per pillar | Task 8 `PillarCompareRow`, `CompareGrid` |
| Compare: stale chip on service header | Task 8 `ServiceColumnHeader` |
| Compare: × remove button | Task 8 `ServiceColumnHeader` |
| Compare: "+ Add service" ghost column | Task 8 `AddServiceColumn` |
| Compare: Back to Browse | Task 8 `CompareShell` footer |
| `getGrade` boundary correctness | Task 2 `scoring.test.ts` (14 tests) |
| `isStale` 90-day threshold | Task 2 `scoring.test.ts` |
| `hasDivergence` 100-point threshold | Task 2 `scoring.test.ts` |
| Compare type-lock enforced | Task 3 `compare-store.test.ts` (9 tests) |

**Not in this plan (Plan 3):**
- Export CSV
- Share comparison URL
- Admin interface
- Read-only MCP server

All public-facing spec requirements are covered.
