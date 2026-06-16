export function StaleBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-5">
      <span className="text-lg">⚠️</span>
      <span>
        One or more scanner results are older than 90 days. Scores may not
        reflect the latest version.
      </span>
    </div>
  );
}
