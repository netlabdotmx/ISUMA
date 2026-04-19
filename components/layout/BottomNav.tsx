"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  PackageSearch,
  ArrowRightLeft,
  RotateCcw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Surtir", href: "/superinventarios/surtir", icon: ClipboardList },
  { label: "Recibir", href: "/superinventarios/recepcion", icon: PackageSearch },
  { label: "Devolver", href: "/superinventarios/devoluciones", icon: RotateCcw },
  { label: "Mover", href: "/superinventarios/traslados", icon: ArrowRightLeft },
  { label: "Buscar", href: "/superinventarios/buscar", icon: Search },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 border-t border-slate-800 safe-bottom">
      <div className="flex items-stretch justify-around h-16">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 min-w-0 transition-colors active:scale-95",
                active
                  ? "text-amber-400"
                  : "text-slate-500 active:text-slate-300"
              )}
            >
              <tab.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-amber-400" : "text-slate-500"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold leading-none truncate max-w-full px-1",
                  active ? "text-amber-400" : "text-slate-600"
                )}
              >
                {tab.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
