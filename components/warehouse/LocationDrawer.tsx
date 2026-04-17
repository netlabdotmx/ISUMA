"use client";

import { X, ArrowRightLeft, History } from "lucide-react";
import Link from "next/link";
import type { RackCellData } from "./RackCell";
import type { OdooQuant } from "@/lib/odoo";

interface LocationDrawerProps {
  open: boolean;
  location: RackCellData | null;
  quants: OdooQuant[];
  loading: boolean;
  onClose: () => void;
}

export function LocationDrawer({
  open,
  location,
  quants,
  loading,
  onClose,
}: LocationDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto inv-scroll p-5 space-y-4">
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
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          {location?.locationId && (
            <Link
              href={`/superinventarios/traslados?from=${location.locationId}`}
              className="flex items-center justify-center gap-2 w-full bg-amber-500 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-colors"
              onClick={onClose}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Crear traslado desde aquí
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-slate-800 text-slate-300 text-sm px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <History className="h-4 w-4" />
            Ver historial
          </button>
        </div>
      </div>
    </>
  );
}
