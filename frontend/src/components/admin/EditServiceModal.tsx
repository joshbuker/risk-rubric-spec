"use client";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface Props {
  service: { id: string; name: string };
  onClose: () => void;
  onSaved: () => void;
}

export function EditServiceModal({ service, onClose, onSaved }: Props) {
  const [name, setName] = useState(service.name);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await adminApi.editService(service.id, { name });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">Edit Service</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Display Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
