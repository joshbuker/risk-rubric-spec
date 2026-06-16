"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  onClose: () => void;
  onIssued: () => void;
}

interface IssuedKey {
  scanner_id: string;
  plaintext_key: string;
  api_key_prefix: string;
  message: string;
}

export function NewKeyModal({ onClose, onIssued }: Props) {
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [saving, setSaving] = useState(false);

  async function issue() {
    setSaving(true);
    const result = await adminApi.issueKey({
      org_name: orgName,
      org_slug: orgSlug,
      display_name: displayName || `RiskRubric scanner powered by ${orgName}`,
    });
    setIssued(result);
    setSaving(false);
    onIssued();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-lg shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-800">Issue New API Key</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {issued ? (
          <div>
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                ⚠ Copy this key now — it will never be shown again.
              </p>
              <code className="block bg-white border border-amber-200 rounded px-3 py-2 text-sm font-mono text-slate-800 break-all">
                {issued.plaintext_key}
              </code>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800 text-white font-semibold rounded-lg text-sm hover:bg-slate-700"
            >
              I have saved the key
            </button>
          </div>
        ) : (
          <>
            {(
              [
                ["Org Name", orgName, setOrgName, "e.g. PointGuard"],
                ["Org Slug", orgSlug, setOrgSlug, "e.g. ptg (used in key prefix)"],
                ["Display Name (optional)", displayName, setDisplayName, "RiskRubric scanner powered by PointGuard"],
              ] as [string, string, (v: string) => void, string][]
            ).map(([label, val, setter, placeholder]) => (
              <div key={label} className="mb-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                <input
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={issue}
                disabled={saving || !orgName || !orgSlug}
                className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Issuing…" : "Issue Key"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
