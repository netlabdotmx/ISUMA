"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Play } from "lucide-react";

interface Move {
  id: number;
  product_id: [number, string];
  product_uom_qty: number;
  quantity: number;
  state: string;
}

interface PickingActionsProps {
  pickingId: number;
  state: string;
  moves: Move[];
}

export function PickingActions({ pickingId, state, moves }: PickingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneQty, setDoneQty] = useState<Record<number, number>>(
    Object.fromEntries(moves.map((m) => [m.id, m.product_uom_qty]))
  );

  if (state === "done" || state === "cancel") {
    return (
      <div className="text-sm text-slate-500 italic">
        Este albarán está en estado final ({state}) y no puede modificarse.
      </div>
    );
  }

  async function executeAction(action: "confirm" | "validate" | "cancel") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/odoo/pickings/${pickingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "validate" && {
            move_quantities: doneQty,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al ejecutar acción");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Edit done quantities if assigned */}
      {state === "assigned" && moves.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">
            Cantidades realizadas
          </h4>
          <div className="space-y-3">
            {moves.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-300 flex-1 truncate">
                  {Array.isArray(m.product_id) ? m.product_id[1] : "Producto"}
                </span>
                <span className="text-xs text-slate-500">
                  Dem: {m.product_uom_qty}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={doneQty[m.id] ?? 0}
                  onChange={(e) =>
                    setDoneQty((prev) => ({
                      ...prev,
                      [m.id]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-20 text-right rounded bg-slate-900 border border-slate-700 px-2 py-1 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {(state === "draft" || state === "waiting") && (
          <button
            disabled={loading}
            onClick={() => executeAction("confirm")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Confirmar
          </button>
        )}

        {state === "assigned" && (
          <button
            disabled={loading}
            onClick={() => executeAction("validate")}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Validar
          </button>
        )}

        <button
          disabled={loading}
          onClick={() => executeAction("cancel")}
          className="flex items-center gap-2 bg-slate-700 hover:bg-red-900/40 text-slate-300 hover:text-red-300 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
