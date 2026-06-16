"use client";
import type { Grade } from "@/lib/types";

const GRADES: Grade[] = ["A", "B", "C", "D", "F"];

interface Props {
  selectedGrades: Grade[];
  minConfidence: number;
  onGradesChange: (grades: Grade[]) => void;
  onMinConfidenceChange: (min: number) => void;
}

export function SidebarFilters({ selectedGrades, minConfidence, onGradesChange, onMinConfidenceChange }: Props) {
  function toggleGrade(g: Grade) {
    onGradesChange(
      selectedGrades.includes(g) ? selectedGrades.filter((x) => x !== g) : [...selectedGrades, g]
    );
  }

  const GRADE_ACTIVE = "border-2 border-current font-bold";
  const GRADE_COLORS: Record<Grade, string> = {
    A: "bg-green-50 text-green-700",
    B: "bg-emerald-50 text-emerald-700",
    C: "bg-yellow-50 text-yellow-700",
    D: "bg-orange-50 text-orange-700",
    F: "bg-red-50 text-red-700",
  };

  return (
    <aside className="w-48 shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col gap-5">
      <div>
        <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Grade</div>
        <div className="flex gap-1 flex-wrap">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className={`px-2 py-0.5 rounded text-xs ${GRADE_COLORS[g]} ${selectedGrades.includes(g) ? GRADE_ACTIVE : "border border-transparent opacity-50"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Min Scanners</div>
        <select
          value={minConfidence}
          onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
        >
          <option value={1}>Any (1+)</option>
          <option value={2}>2+ scanners</option>
          <option value={3}>3+ scanners</option>
        </select>
      </div>
    </aside>
  );
}
