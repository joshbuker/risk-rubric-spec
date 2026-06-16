"use client";
import { useState } from "react";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { TypeChip } from "@/components/ui/TypeChip";
import { EditServiceModal } from "./EditServiceModal";
import type { Grade, ServiceType } from "@/lib/types";

interface ServiceRow {
  id: string;
  name: string;
  service_type: string;
  composite_score: number | null;
  grade: string | null;
  confidence: number;
}

interface Props {
  services: ServiceRow[];
  onRefresh: () => void;
}

export function AdminServiceTable({ services, onRefresh }: Props) {
  const [editing, setEditing] = useState<ServiceRow | null>(null);

  return (
    <>
      <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400">Service</th>
            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400">Type</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-slate-400">Grade</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-slate-400">C</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
              <td className="px-4 py-3"><TypeChip type={s.service_type as ServiceType} /></td>
              <td className="px-4 py-3 text-center">
                {s.grade ? <GradeBadge grade={s.grade as Grade} size="sm" /> : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center text-slate-500">{s.confidence}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => setEditing(s)}
                  className="text-xs font-semibold px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <EditServiceModal
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
