import useSWR from "swr";
import { fetchServices } from "@/lib/api";
import type { ServiceListItem, ServiceType } from "@/lib/types";

export function useServices(serviceType?: ServiceType) {
  return useSWR<ServiceListItem[]>(
    ["services", serviceType ?? "all"],
    () => fetchServices(serviceType)
  );
}
