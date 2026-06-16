"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { FlagCard } from "@/components/admin/FlagCard";

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const load = async () => {
    const data = await adminApi.getFlags();
    setFlags(data);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">
          Identity Matches
          {flags.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded-full">
              {flags.length} pending
            </span>
          )}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Scores are already published. Review and resolve at your own pace.
        </p>
      </div>
      {flags.length === 0 ? (
        <div className="text-center text-slate-400 py-16 text-sm">No pending flags.</div>
      ) : (
        flags.map((f) => <FlagCard key={f.id} flag={f} onResolved={load} />)
      )}
    </div>
  );
}
