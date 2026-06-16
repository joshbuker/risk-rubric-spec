"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const NAV = [
  { href: "/admin/services", label: "Services", section: "Catalog" },
  { href: "/admin/scanners", label: "Scanners", section: "Catalog" },
  { href: "/admin/flags", label: "Identity Matches", section: "Review Queue", badge: true },
  { href: "/admin/keys", label: "API Keys", section: "Access" },
];

export function AdminSidebar({ flagCount = 0 }: { flagCount?: number }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const sections = [...new Set(NAV.map((n) => n.section))];

  return (
    <aside className="w-48 shrink-0 bg-white border-r border-slate-200 min-h-screen flex flex-col py-5">
      {sections.map((section) => (
        <div key={section} className="mb-5">
          <div className="px-4 text-xs font-bold uppercase text-slate-400 tracking-wide mb-1">
            {section}
          </div>
          {NAV.filter((n) => n.section === section).map(({ href, label, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-4 py-2 text-sm transition-colors border-l-2 ${
                pathname.startsWith(href)
                  ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
              {badge && flagCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {flagCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
      <div className="mt-auto px-4">
        <button
          onClick={logout}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
