import { Suspense } from "react";
import { BrowseShell } from "@/components/browse/BrowseShell";

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseShell />
    </Suspense>
  );
}
