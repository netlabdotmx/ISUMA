"use client";

import { cn } from "@/lib/utils";

export interface RackCellData {
  locationId: number | null; // null = not yet defined in Odoo
  label: string;
  abcClass?: "A" | "B" | "C" | null;
  totalQty?: number;
  productCount?: number;
  isHighlighted?: boolean;
  highlightQty?: number;
  highlightReserved?: number;
}

interface RackCellProps {
  data: RackCellData;
  onClick: (data: RackCellData) => void;
}

const ABC_COLORS = {
  A: "bg-green-600 border-green-500 text-white",
  B: "bg-blue-600 border-blue-500 text-white",
  C: "bg-red-700 border-red-600 text-white",
};

export function RackCell({ data, onClick }: RackCellProps) {
  const { locationId, label, abcClass, isHighlighted, highlightQty } = data;

  const isActive = locationId !== null;

  const baseClass = cn(
    "rack-cell relative rounded-lg border-2 flex flex-col items-center justify-center p-1.5 min-w-[56px] min-h-[52px] text-xs font-bold select-none",
    !isActive && "bg-slate-700/50 border-slate-600/50 text-slate-600 cursor-not-allowed",
    isActive && !isHighlighted && !abcClass && "bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500",
    isActive && !isHighlighted && abcClass && ABC_COLORS[abcClass],
    isHighlighted && "animate-pulse bg-yellow-400 border-yellow-300 text-slate-900 shadow-lg shadow-yellow-400/40"
  );

  return (
    <div
      className={baseClass}
      onClick={() => isActive && onClick(data)}
      title={
        isActive
          ? isHighlighted
            ? `${label} — ${highlightQty ?? 0} uds.`
            : label
          : `${label} (disponible)`
      }
      role={isActive ? "button" : "presentation"}
      tabIndex={isActive ? 0 : -1}
      onKeyDown={(e) => {
        if (isActive && (e.key === "Enter" || e.key === " ")) onClick(data);
      }}
    >
      <span className="text-[11px] font-bold leading-none">{label}</span>
      {isActive && abcClass && !isHighlighted && (
        <span className="text-[9px] opacity-70 mt-0.5 font-medium">Clase {abcClass}</span>
      )}
      {isHighlighted && (
        <span className="text-[9px] font-bold mt-0.5">{highlightQty ?? 0} uds</span>
      )}
    </div>
  );
}
