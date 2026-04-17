"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="px-3 py-4 border-t border-slate-800 space-y-2">
      <div className="px-3 py-2">
        <p className="text-xs text-slate-500 truncate">Sesión activa</p>
        <p className="text-sm text-slate-300 font-medium truncate">{userName}</p>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
