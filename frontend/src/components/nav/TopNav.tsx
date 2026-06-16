"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "@/hooks/useCompare";

const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/compare", label: "Compare" },
];

export function TopNav() {
  const pathname = usePathname();
  const { count } = useCompare();

  return (
    <nav className="bg-[#1a1a2e] text-white px-6 py-2.5 flex items-center gap-6">
      <span className="text-blue-400 font-bold text-base tracking-tight">
        CSA Risk Rubric
      </span>
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              pathname.startsWith(href)
                ? "text-blue-300 font-semibold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {label}
            {label === "Compare" && count > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
