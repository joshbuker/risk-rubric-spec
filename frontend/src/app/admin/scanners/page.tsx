"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { ScannerCard } from "@/components/admin/ScannerCard";

interface Scanner {
  id: string;
  name: string;
  org_name: string;
  api_key_prefix: string;
  status: string;
  submission_count: number;
}

export default function AdminScannersPage() {
  const [scanners, setScanners] = useState<Scanner[]>([]);

  const load = async () => {
    const data = await adminApi.getScanners();
    setScanners(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Scanner Partners</h1>
      {scanners.length === 0 ? (
        <div className="text-center text-slate-400 py-16 text-sm">No scanners registered.</div>
      ) : (
        scanners.map((s) => <ScannerCard key={s.id} scanner={s} onRefresh={load} />)
      )}
    </div>
  );
}
