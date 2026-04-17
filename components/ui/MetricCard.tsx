import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  loading?: boolean;
  accent?: "amber" | "blue" | "green" | "orange";
}

const accentMap = {
  amber: "text-amber-400 bg-amber-400/10",
  blue: "text-blue-400 bg-blue-400/10",
  green: "text-green-400 bg-green-400/10",
  orange: "text-orange-400 bg-orange-400/10",
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  accent = "amber",
}: MetricCardProps) {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <span className={cn("p-2 rounded-lg", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-slate-700 animate-pulse rounded" />
      ) : (
        <p className="text-3xl font-bold text-slate-100 tabular-nums">{value}</p>
      )}
      {trend && <p className="text-xs text-slate-500">{trend}</p>}
    </div>
  );
}
