export function StaleBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#ffa657] bg-[#2d2a1a] px-4 py-3 text-sm text-[#ffa657] mb-5">
      <span className="text-lg">⚠️</span>
      <span>
        One or more scanner results are older than 90 days. Scores may not
        reflect the latest version.
      </span>
    </div>
  );
}
