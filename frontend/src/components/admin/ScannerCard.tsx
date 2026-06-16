"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Scanner {
  id: string;
  name: string;
  org_name: string;
  api_key_prefix: string;
  status: string;
  submission_count: number;
}

interface Props {
  scanner: Scanner;
  onRefresh: () => void;
}

export function ScannerCard({ scanner, onRefresh }: Props) {
  const [confirming, setConfirming] = useState(false);

  async function revoke() {
    await adminApi.revokeScanner(scanner.id);
    setConfirming(false);
    onRefresh();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-5 mb-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl shrink-0">
        🔬
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800">{scanner.name}</div>
        <div className="text-xs text-slate-500">{scanner.org_name}</div>
      </div>
      <div className="flex gap-6 shrink-0 text-center">
        <div>
          <div className="text-base font-bold text-slate-800">{scanner.submission_count.toLocaleString()}</div>
          <div className="text-xs text-slate-400 uppercase">Submissions</div>
        </div>
        <div>
          <div className="text-sm font-mono text-slate-600">{scanner.api_key_prefix}…</div>
          <div className="text-xs text-slate-400 uppercase">Key prefix</div>
        </div>
      </div>
      <div className="shrink-0">
        {scanner.status === "revoked" ? (
          <span className="text-xs font-semibold bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg">
            Revoked
          </span>
        ) : confirming ? (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-red-600 font-medium">Confirm revoke?</span>
            <button onClick={revoke} className="text-xs font-semibold px-2 py-1.5 bg-red-600 text-white rounded-lg">Yes</button>
            <button onClick={() => setConfirming(false)} className="text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600">No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
