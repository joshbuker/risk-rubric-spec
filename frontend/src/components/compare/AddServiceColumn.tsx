import Link from "next/link";

export function AddServiceColumn() {
  return (
    <div className="border-l border-[#30363d] flex flex-col">
      <div className="px-3 py-4 border-b-2 border-b-[#30363d] bg-[#161b22] flex-1 flex items-center justify-center">
        <Link
          href="/browse"
          className="flex flex-col items-center gap-2 text-[#8b949e] hover:text-[#c9d1d9] p-4 rounded-lg border border-dashed border-[#30363d] hover:border-[#8b949e] transition-colors text-center"
        >
          <span className="text-2xl">+</span>
          <span className="text-xs font-medium">Add service<br />from Browse</span>
        </Link>
      </div>
    </div>
  );
}
