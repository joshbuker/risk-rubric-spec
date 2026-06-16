import useSWR from "swr";
import { fetchService } from "@/lib/api";
import type { ServiceDetail } from "@/lib/types";

export function useService(id: string) {
  return useSWR<ServiceDetail>(
    id ? `service/${id}` : null,
    () => fetchService(id)
  );
}
