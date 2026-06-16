"use client";
import { Fragment, useState } from "react";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { EditServiceModal } from "./EditServiceModal";
import type { Grade } from "@/lib/types";
import { getGrade } from "@/lib/scoring";

interface ScannerScoreRow {
  scanner_id: string;
  scanner_name: string;
  composite_score: number;
  transparency_score: number;
  reliability_score: number;
  security_score: number;
  privacy_score: number;
  safety_societal_score: number;
  excessive_agency_score: number;
  scored_at: string | null;
}

interface ServiceRow {
  id: string;
  name: string;
  service_type: string;
  composite_score: number | null;
  grade: string | null;
  confidence: number;
  scanner_scores: ScannerScoreRow[];
}

interface Props {
  services: ServiceRow[];
  onRefresh: () => void;
}

const PILLAR_COLS: { key: keyof ScannerScoreRow; label: string }[] = [
  { key: "transparency_score",     label: "Trans"  },
  { key: "reliability_score",      label: "Rel"    },
  { key: "security_score",         label: "Sec"    },
  { key: "privacy_score",          label: "Priv"   },
  { key: "safety_societal_score",  label: "Safety" },
  { key: "excessive_agency_score", label: "Agency" },
];

function scoreColor(v: number): string {
  if (v >= 900) return "text-emerald-700 font-semibold";
  if (v >= 800) return "text-blue-700 font-semibold";
  if (v >= 700) return "text-amber-600 font-semibold";
  if (v >= 600) return "text-orange-600";
  return "text-red-600";
}

// Total columns: Scanner | Grade | Composite | 6 pillars | Action = 10
const TOTAL_COLS = 3 + PILLAR_COLS.length + 1;

export function AdminServiceTable({ services, onRefresh }: Props) {
  const [editing, setEditing] = useState<ServiceRow | null>(null);

  if (services.length === 0) {
    return (
      <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 py-12 text-center text-slate-400 text-sm">
        No services found.
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left   text-xs font-bold uppercase text-slate-400">Scanner</th>
              <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-slate-400">Grade</th>
              <th className="px-4 py-2.5 text-right  text-xs font-bold uppercase text-slate-400">Composite</th>
              {PILLAR_COLS.map((c) => (
                <th key={c.key} className="px-2 py-2.5 text-right text-xs font-bold uppercase text-slate-400">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-2.5 w-16" />
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => {
              const aggGrade = svc.grade as Grade | null;
              return (
                <Fragment key={svc.id}>
                  {/* Service header row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-300">
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {svc.name}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {aggGrade
                        ? <GradeBadge grade={aggGrade} size="sm" />
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 text-xs tabular-nums">
                      {svc.composite_score != null ? svc.composite_score.toFixed(1) : "—"}
                    </td>
                    {PILLAR_COLS.map((c) => (
                      <td key={c.key} className="px-2 py-2.5" />
                    ))}
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setEditing(svc)}
                        className="text-xs font-semibold px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-white"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>

                  {/* Per-scanner score rows */}
                  {svc.scanner_scores.length === 0 ? (
                    <tr className="border-b border-slate-100">
                      <td colSpan={TOTAL_COLS} className="px-8 py-2 text-slate-400 text-xs italic">
                        No scanner submissions yet
                      </td>
                    </tr>
                  ) : (
                    svc.scanner_scores.map((ss) => {
                      const grade = getGrade(ss.composite_score) as Grade;
                      return (
                        <tr key={ss.scanner_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-8 py-2 text-slate-600">{ss.scanner_name}</td>
                          <td className="px-4 py-2 text-center">
                            <GradeBadge grade={grade} size="sm" />
                          </td>
                          <td className={`px-4 py-2 text-right tabular-nums ${scoreColor(ss.composite_score)}`}>
                            {ss.composite_score.toFixed(1)}
                          </td>
                          {PILLAR_COLS.map((c) => (
                            <td key={c.key} className={`px-2 py-2 text-right tabular-nums text-xs ${scoreColor(ss[c.key] as number)}`}>
                              {(ss[c.key] as number).toFixed(0)}
                            </td>
                          ))}
                          <td />
                        </tr>
                      );
                    })
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

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
