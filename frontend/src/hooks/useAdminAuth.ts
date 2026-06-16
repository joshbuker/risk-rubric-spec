"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";

export function useAdminAuth() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(secret: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.login(secret);
      if (!data.access_token) {
        setError("Invalid secret");
        return;
      }
      document.cookie = `admin_token=${data.access_token}; path=/; max-age=${8 * 3600}`;
      router.push("/admin/services");
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    document.cookie = "admin_token=; Max-Age=0; path=/";
    router.push("/admin/login");
  }

  return { login, logout, error, loading };
}
