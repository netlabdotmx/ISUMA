"use client";

import { useState } from "react";
import { X, ArrowRightLeft, History, ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import Link from "next/link";
import type { RackCellData } from "./RackCell";
import type { OdooQuant } from "@/lib/odoo";

interface StockMove {
  id: number;
  product_id: [number, string];
  product_uom_qty: number;
  quantity: number;
  state: string;
  location_id: [number, string];
  location_dest_id: [number, string];
  picking_id: [number, string] | false;
  date: string;
  reference: string | false;
}

interface LocationDrawerProps {
  open: boolean;
  location: RackCellData | null;
  quants: OdooQuant[];
  loading: boolean;
  onClose: () => void;
}

function formatDate(s: string) {
  return new Date(s).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LocationDrawer({
  open,
  location,
  quants,
  loading,
  onClose,
}: LocationDrawerProps) {
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [movesLoading, setMovesLoading] = useState(false);
  const [movesLoaded, setMovesLoaded] = useState(false);

  async function loadHistory() {
    if (!location?.locationId || movesLoaded) {
      setTab("history");
      return;
    }
    setTab("history");
    setMovesLoading(true);
    try {
      const res = await fetch(
        `/api/odoo/stock/moves?location_id=${location.locationId}&limit=30`
      );
      const data = await res.json();
      setMoves(data.moves ?? []);
      setMovesLoaded(true);
    } catch (e) {
      console.error("Error loading move history", e);
    } finally {
      setMovesLoading(false);
    }
  }

  // Reset state when drawer closes or location changes
  const handleClose = () => {
    setTab("stock");
    setMoves([]);
    setMovesLoaded(false);
    onClose();
  };

  const locId = location?.locationId ?? 0;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={handleClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-700 z-50 transform transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h3 className="font-bold text-slate-100 text-lg">
              {location?.label ?? "Ubicación"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {location?.productCount ?? 0} productos ·{" "}
              {location?.totalQty ?? 0} unidades
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setTab("stock")}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === "stock"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Stock actual
          </button>
          <button
            onClick={loadHistory}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              tab === "history"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="h-3 w-3" />
            Historial
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto inv-scroll p-5 space-y-4">
          {/* Stock tab */}
          {tab === "stock" && (
            <>
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-slate-800 animate-pulse" />
                  ))}
                </div>
              )}

              {!loading && quants.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No hay stock en esta ubicación
                </div>
              )}

              {!loading &&
                quants.map((quant) => (
                  <div
                    key={quant.id}
                    className="rounded-lg bg-slate-800 border border-slate-700 p-3"
                  >
                    <p className="text-sm text-slate-100 font-medium leading-tight">
                      {Array.isArray(quant.product_id)
                        ? quant.product_id[1]
                        : "Producto"}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>
                        <span className="text-green-400 font-semibold">
                          {quant.quantity}
                        </span>{" "}
                        disponible
                      </span>
                      {quant.reserved_quantity > 0 && (
                        <span>
                          <span className="text-amber-400 font-semibold">
                            {quant.reserved_quantity}
                          </span>{" "}
                          reservado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </>
          )}

          {/* History tab */}
          {tab === "history" && (
            <>
              {movesLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                </div>
              )}

              {!movesLoading && moves.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Sin movimientos registrados
                </div>
              )}

              {!movesLoading &&
                moves.map((mv) => {
                  const isIncoming =
                    Array.isArray(mv.location_dest_id) &&
                    mv.location_dest_id[0] === locId;
                  const productName = Array.isArray(mv.product_id)
                    ? mv.product_id[1]
                    : "Producto";
                  const fromLoc = Array.isArray(mv.location_id)
                    ? mv.location_id[1]
                    : "—";
                  const toLoc = Array.isArray(mv.location_dest_id)
                    ? mv.location_dest_id[1]
                    : "—";

                  return (
                    <div
                      key={mv.id}
                      className="rounded-lg bg-slate-800 border border-slate-700 p-3 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-slate-100 font-medium leading-tight flex-1">
                          {productName}
                        </p>
                        <span
                          className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${
                            isIncoming
                              ? "bg-green-900/40 text-green-400"
                              : "bg-red-900/40 text-red-400"
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUp className="h-3 w-3" />
                          )}
                          {mv.quantity}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>
                          {isIncoming ? "Desde" : "Hacia"}:{" "}
                          <span className="text-slate-400">
                            {isIncoming ? fromLoc : toLoc}
                          </span>
                        </p>
                        {mv.reference && (
                          <p className="font-mono text-slate-400">
                            {mv.reference}
                          </p>
                        )}
                        <p className="text-slate-600">{formatDate(mv.date)}</p>
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          {location?.locationId && (
            <Link
              href={`/superinventarios/traslados/nuevo?from=${location.locationId}`}
              className="flex items-center justify-center gap-2 w-full bg-amber-500 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-colors"
              onClick={handleClose}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Crear traslado desde aquí
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
