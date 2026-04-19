"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCcw,
  Package,
  Minus,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  User,
} from "lucide-react";

interface PickingDetail {
  id: number;
  name: string;
  state: string;
  partner_id?: [number, string] | false;
  origin?: string | false;
}

interface MoveDetail {
  id: number;
  product_id: [number, string];
  product_uom_qty: number;
  quantity: number;
  state: string;
  location_id: [number, string];
  location_dest_id: [number, string];
}

interface ReturnLine {
  move_id: number;
  product_name: string;
  max_qty: number;
  quantity: number;
  selected: boolean;
}

export default function DevolucionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  const [pickingId, setPickingId] = useState<number | null>(null);
  const [picking, setPicking] = useState<PickingDetail | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    params.then(({ id }) => setPickingId(parseInt(id)));
  }, [params]);

  useEffect(() => {
    if (pickingId === null) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/odoo/pickings/${pickingId}`);
        if (!res.ok) throw new Error("No se pudo cargar el albarán");
        const data = await res.json();

        const pickingData: PickingDetail = data.picking;
        const movesData: MoveDetail[] = data.moves;

        setPicking(pickingData);
        setReturnLines(
          movesData.map((m) => ({
            move_id: m.id,
            product_name: m.product_id[1],
            max_qty: m.quantity || m.product_uom_qty,
            quantity: m.quantity || m.product_uom_qty,
            selected: true,
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [pickingId]);

  const toggleLine = useCallback((moveId: number) => {
    setReturnLines((prev) =>
      prev.map((l) =>
        l.move_id === moveId ? { ...l, selected: !l.selected } : l
      )
    );
  }, []);

  const adjustQty = useCallback((moveId: number, delta: number) => {
    setReturnLines((prev) =>
      prev.map((l) =>
        l.move_id === moveId
          ? { ...l, quantity: Math.max(1, Math.min(l.max_qty, l.quantity + delta)) }
          : l
      )
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!pickingId) return;

    const selectedLines = returnLines.filter((l) => l.selected && l.quantity > 0);
    if (selectedLines.length === 0) {
      setError("Selecciona al menos una línea para devolver");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/odoo/pickings/${pickingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "return",
          return_lines: selectedLines.map((l) => ({
            move_id: l.move_id,
            quantity: l.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear devolución");
      }

      const data = await res.json();
      setSuccess(
        `Devolución creada exitosamente${data.return_picking_id ? ` (ID: ${data.return_picking_id})` : ""}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear devolución");
    } finally {
      setSubmitting(false);
    }
  }, [pickingId, returnLines]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">{success}</h3>
        <p className="text-slate-500 text-sm mt-2">
          La devolución aparecerá como recepción pendiente.
        </p>
        <button
          onClick={() => router.push("/superinventarios/devoluciones")}
          className="mt-6 px-5 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors min-h-[48px]"
        >
          Volver a devoluciones
        </button>
      </div>
    );
  }

  if (!picking || returnLines.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-20">
        <p className="text-slate-400">Sin líneas disponibles para devolver.</p>
        <button
          onClick={() => router.push("/superinventarios/devoluciones")}
          className="mt-4 text-sm text-amber-400 underline"
        >
          Volver
        </button>
      </div>
    );
  }

  const selectedCount = returnLines.filter((l) => l.selected).length;
  const totalReturnQty = returnLines
    .filter((l) => l.selected)
    .reduce((sum, l) => sum + l.quantity, 0);
  const partner = Array.isArray(picking.partner_id) ? picking.partner_id[1] : null;

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[calc(100vh-4rem)] pb-4">
      {/* Top bar */}
      <div className="flex items-center gap-3 py-3 px-1">
        <button
          onClick={() => router.push("/superinventarios/devoluciones")}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-100 text-sm">
              {picking.name}
            </span>
            {partner && (
              <span className="text-xs text-slate-500 truncate">
                <User className="h-3 w-3 inline mr-0.5" />
                {partner}
              </span>
            )}
          </div>
          {picking.origin && (
            <p className="text-[11px] text-slate-600 truncate">Ref: {picking.origin}</p>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="mx-1 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
        <RotateCcw className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80">
          Selecciona los productos y cantidades a devolver. Se creará una recepción inversa.
        </p>
      </div>

      {error && (
        <div className="mx-1 mb-3 flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Return lines */}
      <div className="flex-1 space-y-2 px-1 overflow-y-auto">
        {returnLines.map((line) => (
          <div
            key={line.move_id}
            className={[
              "rounded-xl border-2 p-4 transition-all",
              line.selected
                ? "bg-slate-800/60 border-amber-500/30"
                : "bg-slate-800/20 border-slate-800 opacity-50",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => toggleLine(line.move_id)}
                className={[
                  "w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all mt-0.5",
                  line.selected
                    ? "bg-amber-500 border-amber-500"
                    : "border-slate-600 hover:border-slate-400",
                ].join(" ")}
              >
                {line.selected && (
                  <svg className="w-3.5 h-3.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  {line.product_name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Entregado: {line.max_qty} uds
                </p>
              </div>

              {/* Qty adjuster */}
              {line.selected && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => adjustQty(line.move_id, -1)}
                    disabled={line.quantity <= 1}
                    className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Minus className="h-4 w-4 text-slate-300" />
                  </button>
                  <span className="text-lg font-bold text-slate-100 tabular-nums w-8 text-center">
                    {line.quantity}
                  </span>
                  <button
                    onClick={() => adjustQty(line.move_id, 1)}
                    disabled={line.quantity >= line.max_qty}
                    className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Plus className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom summary + action */}
      <div className="mt-4 px-1 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {selectedCount} producto{selectedCount !== 1 ? "s" : ""} · {totalReturnQty} uds
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || selectedCount === 0}
          className="w-full px-5 py-3.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 transition-colors min-h-[48px] flex items-center justify-center gap-2 active:scale-[0.97]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {submitting ? "Creando devolución…" : "Crear devolución"}
        </button>
      </div>
    </div>
  );
}
