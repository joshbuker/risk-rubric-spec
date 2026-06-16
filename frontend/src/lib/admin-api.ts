const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getToken(): string {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("admin_token="))
      ?.split("=")[1] ?? ""
  );
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    document.cookie = "admin_token=; Max-Age=0; path=/";
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`Admin API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const adminApi = {
  login: (secret: string) =>
    fetch(`${API_BASE}/admin/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    }).then((r) => r.json()),

  getServices: (q?: string, type?: string) =>
    adminFetch<any[]>(
      `/services?${new URLSearchParams({
        ...(q ? { q } : {}),
        ...(type ? { service_type: type } : {}),
      })}`
    ),

  editService: (id: string, body: object) =>
    adminFetch(`/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getFlags: () => adminFetch<any[]>("/flags"),
  acceptFlag: (id: string) =>
    adminFetch(`/flags/${id}/accept`, { method: "POST" }),
  rejectFlag: (id: string) =>
    adminFetch(`/flags/${id}/reject`, { method: "POST" }),

  getScanners: () => adminFetch<any[]>("/scanners"),
  revokeScanner: (id: string) =>
    adminFetch(`/scanners/${id}/revoke`, { method: "POST" }),

  getKeys: () => adminFetch<any[]>("/keys"),
  issueKey: (body: object) =>
    adminFetch<{
      scanner_id: string;
      plaintext_key: string;
      api_key_prefix: string;
      message: string;
    }>("/keys", { method: "POST", body: JSON.stringify(body) }),
  revokeKey: (id: string) =>
    adminFetch(`/keys/${id}/revoke`, { method: "POST" }),
};
