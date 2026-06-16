"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  flag: {
    id: string;
    match_tier: string;
    incoming_identity: Record<string, unknown>;
    existing_identity: Record<string, unknown> | null;
    created_at: string;
  };
  onResolved: () => void;
}

function IdentityField({ label, incoming, existing }: { label: string; incoming: unknown; existing: unknown }) {
  const differs = String(incoming) !== String(existing);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${differs ? "text-amber-700 bg-amber-50 px-1 rounded" : "text-slate-800"}`}>
        {String(incoming ?? "null")}
      </span>
    </div>
  );
}

export function FlagCard({ flag, onResolved }: Props) {
  const [acting, setActing] = useState(false);

  async function handle(action: "accept" | "reject") {
    setActing(true);
    if (action === "accept") await adminApi.acceptFlag(flag.id);
    else await adminApi.rejectFlag(flag.id);
    onResolved();
  }

  const incomingFields = Object.entries(flag.incoming_identity);

  return (
    <div className="bg-white rounded-xl border-l-4 border-l-orange-400 border border-slate-200 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="font-bold text-sm text-slate-800">
          {flag.match_tier === "medium_confidence" ? "1-field mismatch" : "No match — new service"}
        </div>
        <span className="text-xs text-slate-400">
          {new Date(flag.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_32px_1fr] gap-3 px-5 py-4 items-start">
        <div>
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Incoming (from scanner)</div>
          <div className="flex flex-col gap-2">
            {incomingFields.map(([key, val]) => (
              <IdentityField
                key={key}
                label={key}
                incoming={val}
                existing={flag.existing_identity?.[key]}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center pt-6 text-slate-400 text-lg">→</div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Existing service</div>
          {flag.existing_identity ? (
            <div className="flex flex-col gap-2">
              {incomingFields.map(([key]) => (
                <IdentityField
                  key={key}
                  label={key}
                  incoming={flag.existing_identity![key]}
                  existing={flag.existing_identity![key]}
                />
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">No existing match — auto-created new service</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-t border-slate-200">
        <button
          onClick={() => handle("accept")}
          disabled={acting}
          className="text-sm font-semibold px-4 py-1.5 bg-green-100 text-green-800 border border-green-300 rounded-lg hover:bg-green-200 disabled:opacity-50"
        >
          ✓ Accept — merge into existing
        </button>
        <button
          onClick={() => handle("reject")}
          disabled={acting}
          className="text-sm font-semibold px-4 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg hover:bg-red-200 disabled:opacity-50"
        >
          ✗ Reject — keep as separate service
        </button>
        <span className="ml-auto text-xs text-slate-400">
          Scores are already live — this is async cleanup
        </span>
      </div>
    </div>
  );
}
