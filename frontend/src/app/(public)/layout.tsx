import { TopNav } from "@/components/nav/TopNav";
import { CompareProvider } from "@/hooks/useCompare";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompareProvider>
      <TopNav />
      {children}
    </CompareProvider>
  );
}
