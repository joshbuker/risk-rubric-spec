import { TopNav } from "@/components/nav/TopNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
