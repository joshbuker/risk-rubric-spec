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

  return {
    items,
    add,
    remove,
    clear,
    lockedType: items[0]?.service_type ?? null,
    canAdd: useCallback((type: ServiceType) => canAdd(type), []),
    count: items.length,
  };
}
