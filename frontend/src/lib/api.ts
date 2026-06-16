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
