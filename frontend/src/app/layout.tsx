import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/nav/TopNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CSA Risk Rubric",
  description: "AI service risk ratings from the Cloud Security Alliance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 min-h-screen`}>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
