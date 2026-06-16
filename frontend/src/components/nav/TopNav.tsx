"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCompare } from "@/hooks/useCompare";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/browse",  label: "Browse"   },
  { href: "/compare", label: "Compare"  },
  { href: "/scanners", label: "Scanners" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCompare();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <nav className="bg-[#161b22] border-b border-[#30363d] px-6 flex items-center gap-6 h-[52px]">
      <span className="text-[#79c0ff] font-bold text-[15px] tracking-tight shrink-0">
        RiskRubric
      </span>
      <div className="flex items-center h-full">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative px-3 h-full flex items-center text-[13px] transition-colors ${
                active ? "text-[#79c0ff]" : "text-[#8b949e] hover:text-[#c9d1d9]"
              }`}
            >
              {label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#79c0ff]" />
              )}
              {label === "Compare" && count > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <form onSubmit={handleSearch} className="ml-auto">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search models, MCP servers…"
          className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-[#8b949e] text-[12px] w-56 focus:outline-none focus:border-[#79c0ff] placeholder:text-[#8b949e]"
        />
      </form>
    </nav>
  );
}
