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
