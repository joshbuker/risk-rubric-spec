import type { Grade } from "@/lib/types";

const GRADE_CLASSES: Record<Grade, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-emerald-100 text-emerald-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};

interface Props {
  grade: Grade;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "w-7 h-5 text-xs rounded",
  md: "w-8 h-6 text-sm rounded",
  lg: "w-14 h-12 text-4xl rounded-lg",
};

export function GradeBadge({ grade, size = "md" }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center font-bold ${GRADE_CLASSES[grade]} ${SIZE_CLASSES[size]}`}
    >
      {grade}
    </span>
  );
}
