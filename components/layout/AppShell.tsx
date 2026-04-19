"use client";

import { useState } from "react";
import { Bell, User, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/ui/Sidebar";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

export function AppShell({ children, userName, userEmail }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Desktop sidebar — always visible lg+ */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel — slides in from left */}
          <div className="relative z-50 flex animate-slide-down">
            <Sidebar
              userName={userName}
              userEmail={userEmail}
              onNavClick={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-slate-900 border-b border-slate-800 shrink-0 gap-3">
          {/* Left: hamburger (mobile) + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold text-slate-100 truncate">
              SuperInventarios
            </h1>
          </div>

          {/* Right: bell + user */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-700">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[140px]">
                {userName ?? "ISUMA"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto inv-scroll p-4 sm:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
