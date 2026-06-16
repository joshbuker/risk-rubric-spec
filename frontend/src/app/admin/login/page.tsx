"use client";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminLoginPage() {
  const [secret, setSecret] = useState("");
  const { login, error, loading } = useAdminAuth();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="font-bold text-blue-600 text-lg">CSA Risk Rubric</span>
          <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase">
            Admin
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">CSA staff only.</p>

        <form onSubmit={(e) => { e.preventDefault(); login(secret); }}>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Admin Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Enter admin secret"
            required
          />
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
