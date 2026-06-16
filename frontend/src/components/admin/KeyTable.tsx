"use client";
import { adminApi } from "@/lib/admin-api";

interface KeyRow {
  scanner_id: string;
  org_name: string;
  display_name: string;
  api_key_prefix: string;
  status: string;
  created_at: string | null;
  last_used_at: string | null;
  submission_count: number;
}

interface Props {
  keys: KeyRow[];
  onRefresh: () => void;
}

export function KeyTable({ keys, onRefresh }: Props) {
  async function revoke(id: string) {
    if (!window.confirm("Revoke this key? This immediately blocks all submissions from this scanner.")) return;
    await adminApi.revokeKey(id);
    onRefresh();
  }

  return (
    <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {["Scanner", "Key prefix", "Issued", "Last used", "Submissions", "Status", ""].map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-400">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k.scanner_id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="px-4 py-3">
              <div className="font-semibold text-slate-800">{k.org_name}</div>
              <div className="text-xs text-slate-400">{k.display_name}</div>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.api_key_prefix}…</td>
            <td className="px-4 py-3 text-xs text-slate-500">
              {k.created_at ? new Date(k.created_at).toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-3 text-xs text-slate-500">
              {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-700">{k.submission_count.toLocaleString()}</td>
            <td className="px-4 py-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${k.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {k.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              {k.status === "active" && (
                <button
                  onClick={() => revoke(k.scanner_id)}
                  className="text-xs font-semibold px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
                >
                  Revoke
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
