"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  PackageSearch,
  ArrowRightLeft,
  Sun,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./LogoutButton";

const navItems = [
  {
    label: "Dashboard",
    href: "/superinventarios",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Layout Almacén",
    href: "/superinventarios/layout",
    icon: Map,
  },
  {
    label: "Recepción",
    href: "/superinventarios/recepcion",
    icon: PackageSearch,
  },
  {
    label: "Traslados",
    href: "/superinventarios/traslados",
    icon: ArrowRightLeft,
  },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  onNavClick?: () => void;
}

export function Sidebar({ userName = "Usuario", userEmail, onNavClick }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-slate-900 border-r border-slate-800/80">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
          <Sun className="h-5 w-5 text-white" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 blur-md opacity-40 -z-10 scale-110" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none tracking-tight">SuperInventarios</p>
          <p className="text-slate-500 text-[11px] mt-0.5">Sunny · ISUMA</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto inv-scroll">
        <p className="px-3 pb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Menú
        </p>
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-amber-500/12 text-amber-400 nav-active-glow"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {active && (
                <ChevronRight className="h-3 w-3 text-amber-500/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Back to Landing */}
      <div className="px-3 pb-1">
        <Link
          href="/"
          onClick={onNavClick}
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors rounded-lg hover:bg-slate-800/50"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver al sitio
        </Link>
      </div>

      {/* User + Logout */}
      <LogoutButton userName={userEmail ?? userName} />
    </aside>
  );
}
