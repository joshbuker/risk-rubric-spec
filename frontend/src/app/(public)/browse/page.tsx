import { BrowseShell } from "@/components/browse/BrowseShell";

export default function BrowsePage() {
  return (
    <div>
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800">Browse AI Services</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Risk grades from independent scanner partners
        </p>
      </div>
      <BrowseShell />
    </div>
  );
}
