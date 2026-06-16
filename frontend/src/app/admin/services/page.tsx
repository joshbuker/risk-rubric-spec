"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { AdminServiceTable } from "@/components/admin/AdminServiceTable";
import type { ServiceType } from "@/lib/types";

const TABS: { type: ServiceType; label: string }[] = [
  { type: "ai_model", label: "AI Models" },
  { type: "mcp_server", label: "MCP Servers" },
];

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ServiceType>("ai_model");

  const load = async () => {
    const data = await adminApi.getServices(query || undefined);
    setServices(data);
  };

  useEffect(() => { load(); }, []);

  const visible = services.filter((s) => s.service_type === activeTab);

  const countOf = (type: ServiceType) => services.filter((s) => s.service_type === type).length;

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

      <div className="flex border-b border-slate-200 bg-white rounded-t-xl mb-0">
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === type
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === type ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
            }`}>
              {countOf(type)}
            </span>
          </button>
        ))}
      </div>

      <AdminServiceTable services={visible} onRefresh={load} />
    </div>
  );
}
