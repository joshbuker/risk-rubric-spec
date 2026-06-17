"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getCompareItems,
  addToCompare,
  removeFromCompare,
  clearCompare,
} from "@/lib/compare-store";
import type { CompareItem } from "@/lib/compare-store";
import type { ServiceType } from "@/lib/types";
import { createElement } from "react";

interface CompareContextValue {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  lockedType: ServiceType | null;
  canAdd: (type: ServiceType) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    setItems(getCompareItems());
  }, []);

  const refresh = useCallback(() => setItems(getCompareItems()), []);

  const add = useCallback((item: CompareItem) => {
    addToCompare(item);
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    removeFromCompare(id);
    refresh();
  }, [refresh]);

  const clear = useCallback(() => {
    clearCompare();
    setItems([]);
  }, []);

  const canAdd = useCallback((type: ServiceType) => {
    if (items.length >= 4) return false;
    const locked = items[0]?.service_type;
    return !locked || locked === type;
  }, [items]);

  return createElement(
    CompareContext.Provider,
    {
      value: {
        items,
        add,
        remove,
        clear,
        count: items.length,
        lockedType: items[0]?.service_type ?? null,
        canAdd,
      },
    },
    children,
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
