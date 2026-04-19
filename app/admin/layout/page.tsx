"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Save, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { LayoutEditor, type EditorGrid } from "@/components/warehouse/LayoutEditor";

const STORAGE_KEY = "isuma-warehouse-layout-v1";

export default function AdminLayoutPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);

  // On mount, try to load layout from server and sync to localStorage for LayoutEditor
  useEffect(() => {
    async function loadFromServer() {
      try {
        const res = await fetch("/api/odoo/warehouse-layout");
        if (res.ok) {
          const data = await res.json();
          if (data.grid) {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ grid: data.grid })
            );
          }
        }
      } catch {
        // ignore - use whatever is in localStorage
      } finally {
        setLoaded(true);
      }
    }
    loadFromServer();
  }, []);

  // Save current localStorage grid to server
  const saveToServer = useCallback(async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error("No hay layout para guardar");
      const parsed = JSON.parse(raw);
      const grid: EditorGrid = parsed.grid;

      const res = await fetch("/api/odoo/warehouse-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      console.error("Error saving layout", e);
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            Editor de Plano
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Diseña la cuadrícula de tu CEDIS — los cambios se guardan en el
            servidor
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Guardado
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Error al guardar
            </span>
          )}

          <button
            onClick={saveToServer}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors text-sm font-medium disabled:opacity-50 min-h-[40px]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar en servidor
          </button>

          <button
            onClick={() => router.push("/superinventarios/buscar")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm font-medium min-h-[40px]"
          >
            <X className="h-4 w-4" />
            Cerrar
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <LayoutEditor />
      </div>
    </div>
  );
}
