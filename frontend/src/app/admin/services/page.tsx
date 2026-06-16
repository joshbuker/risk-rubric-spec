"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { AdminServiceTable } from "@/components/admin/AdminServiceTable";

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  const load = async () => {
    const data = await adminApi.getServices(query || undefined);
    setServices(data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Services</h1>
          <p className="text-sm text-slate-500 mt-0.5">All registered AI Models and MCP Servers</p>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name…"
          className="max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={load}
          className="px-4 py-2 text-sm bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700"
        >
          Search
        </button>
      </div>
      <AdminServiceTable services={services} onRefresh={load} />
    </div>
  );
}
