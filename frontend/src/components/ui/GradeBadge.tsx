import type { Grade } from "@/lib/types";

const LIGHT: Record<Grade, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-emerald-100 text-emerald-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};

const DARK: Record<Grade, string> = {
  A: "bg-[#1a472a] text-[#56d364]",
  B: "bg-[#1c3a1c] text-[#56d364]",
  C: "bg-[#2d2a1a] text-[#ffa657]",
  D: "bg-[#2d1f1a] text-[#f0883e]",
  F: "bg-[#2d1a1a] text-[#f85149]",
};

interface Props {
  grade: Grade;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

const SIZE_CLASSES = {
  sm: "w-7 h-5 text-xs rounded",
  md: "w-8 h-6 text-sm rounded",
  lg: "w-14 h-12 text-4xl rounded-lg",
};

export function GradeBadge({ grade, size = "md", variant = "light" }: Props) {
  const colorClass = variant === "dark" ? DARK[grade] : LIGHT[grade];
  return (
    <span className={`inline-flex items-center justify-center font-bold ${colorClass} ${SIZE_CLASSES[size]}`}>
      {grade}
    </span>
  );
}
