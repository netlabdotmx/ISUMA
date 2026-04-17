"use client";

import { PICKING_STATES } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PickingStatusBadgeProps {
  state: string;
}

export function PickingStatusBadge({ state }: PickingStatusBadgeProps) {
  const config = PICKING_STATES[state] ?? {
    label: state,
    bg: "bg-slate-700",
    text: "text-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}
