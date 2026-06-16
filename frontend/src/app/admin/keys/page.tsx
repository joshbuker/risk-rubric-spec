"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { KeyTable } from "@/components/admin/KeyTable";
import { NewKeyModal } from "@/components/admin/NewKeyModal";

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

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    const data = await adminApi.getKeys();
    setKeys(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Scanner API Keys</h1>
          <p className="text-sm text-slate-500 mt-0.5">Argon2-hashed. Full key shown once at creation.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm font-semibold px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Issue new key
        </button>
      </div>
      <KeyTable keys={keys} onRefresh={load} />
      {showModal && <NewKeyModal onClose={() => setShowModal(false)} onIssued={load} />}
    </div>
  );
}
