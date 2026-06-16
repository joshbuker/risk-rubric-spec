import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-[#1a1a2e] text-white px-6 py-2.5 flex items-center gap-3">
        <span className="text-blue-400 font-bold">CSA Risk Rubric</span>
        <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Admin
        </span>
      </div>
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
