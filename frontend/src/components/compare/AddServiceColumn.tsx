import Link from "next/link";

export function AddServiceColumn() {
  return (
    <div className="border-l border-slate-200 flex flex-col">
      <div className="px-3 py-4 border-b-2 border-b-slate-200 bg-slate-50 flex-1 flex items-center justify-center">
        <Link
          href="/browse"
          className="flex flex-col items-center gap-2 text-slate-400 hover:text-slate-600 p-4 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 transition-colors text-center"
        >
          <span className="text-2xl">+</span>
          <span className="text-xs font-medium">Add service<br />from Browse</span>
        </Link>
      </div>
    </div>
  );
}
