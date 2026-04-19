"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, Trash2, MapPin, Package } from "lucide-react";
import { ProductSearch } from "./ProductSearch";

interface StockByLocation {
  locationId: number;
  locationName: string;
  quantity: number;
  reserved: number;
}

export interface MoveLine {
  id: string;
  product_id: number;
  product_name: string;
  product_code: string;
  qty_demanded: number;
  qty_done: number;
  qty_available?: number;
  stockByLocation?: StockByLocation[];
}

interface MovementLinesProps {
  lines: MoveLine[];
  onChange: (lines: MoveLine[]) => void;
  showDone?: boolean;
  locationId?: number;
  onSuggestOrigin?: (locationId: number) => void;
  /** If true, stock breakdown chips are mandatory and block qty input until origin is selected */
  requireOriginFromStock?: boolean;
}

export function MovementLines({
  lines,
  onChange,
  showDone = false,
  locationId,
  onSuggestOrigin,
  requireOriginFromStock = false,
}: MovementLinesProps) {
  const [nextId, setNextId] = useState(1);
  const [loadingStock, setLoadingStock] = useState<Record<string, boolean>>({});

  // Ref to always access the latest lines inside async callbacks (avoids stale closure)
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const fetchStockByLocation = useCallback(
    async (lineId: string, productId: number) => {
      setLoadingStock((prev) => ({ ...prev, [lineId]: true }));
      try {
        const res = await fetch(`/api/odoo/stock?product_id=${productId}`);
        const data = await res.json();
        const quants: { location_id: [number, string]; quantity: number; reserved_quantity: number }[] =
          data.quants ?? [];
        const byLoc: StockByLocation[] = [];
        const seen = new Set<number>();
        for (const q of quants) {
          const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
          const locName = Array.isArray(q.location_id) ? q.location_id[1] : "—";
          if (seen.has(locId)) {
            const existing = byLoc.find((b) => b.locationId === locId);
            if (existing) {
              existing.quantity += q.quantity;
              existing.reserved += q.reserved_quantity;
            }
          } else {
            seen.add(locId);
            byLoc.push({
              locationId: locId,
              locationName: locName,
              quantity: q.quantity,
              reserved: q.reserved_quantity,
            });
          }
        }
        onChange(
          linesRef.current.map((l) =>
            l.id === lineId ? { ...l, stockByLocation: byLoc } : l
          )
        );
      } catch (e) {
        console.error("Error fetching stock breakdown", e);
      } finally {
        setLoadingStock((prev) => ({ ...prev, [lineId]: false }));
      }
    },
    [onChange]
  );

  function addLine() {
    const newLine: MoveLine = {
      id: `line-${nextId}`,
      product_id: 0,
      product_name: "",
      product_code: "",
      qty_demanded: 1,
      qty_done: 0,
    };
    onChange([...lines, newLine]);
    setNextId((n) => n + 1);
  }

  function removeLine(id: string) {
    onChange(lines.filter((l) => l.id !== id));
  }

  function updateLine(id: string, updates: Partial<MoveLine>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }

  // Check if origin has been selected (for requireOriginFromStock mode)
  const originSelected = !!locationId;

  return (
    <div className="space-y-3">
      {/* Card-based layout for mobile */}
      <div className="space-y-4">
        {lines.map((line) => {
          const hasStock = line.stockByLocation && line.stockByLocation.length > 0;
          const noStock = line.stockByLocation && line.stockByLocation.length === 0 && !loadingStock[line.id];
          const needsOrigin = requireOriginFromStock && hasStock && !originSelected;

          return (
            <div
              key={line.id}
              className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3"
            >
              {/* Product selection */}
              {line.product_id === 0 ? (
                <ProductSearch
                  placeholder="Buscar producto por nombre o código..."
                  onSelect={(p) => {
                    const updatedLine: Partial<MoveLine> = {
                      product_id: p.id,
                      product_name: p.name,
                      product_code: p.default_code || "",
                      qty_available: p.qty_available,
                    };
                    updateLine(line.id, updatedLine);
                    fetchStockByLocation(line.id, p.id);
                  }}
                  clearOnSelect={false}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-100 font-medium truncate">
                        {line.product_name}
                      </p>
                      {line.product_code && (
                        <p className="text-xs text-slate-400 font-mono">
                          {line.product_code}
                        </p>
                      )}
                      {line.qty_available !== undefined && (
                        <p className="text-xs text-slate-500">
                          Stock total: {line.qty_available}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Stock breakdown by location — mandatory chips */}
              {line.product_id > 0 && (
                <>
                  {loadingStock[line.id] && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse py-2">
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
                      Consultando stock por ubicación...
                    </div>
                  )}

                  {hasStock && onSuggestOrigin && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-400" />
                        {requireOriginFromStock
                          ? "Selecciona la ubicación de origen:"
                          : "Stock por ubicación:"}
                      </p>
                      <div className="flex flex-col gap-2">
                        {line.stockByLocation!.map((loc) => {
                          const isSelected = locationId === loc.locationId;
                          const available = loc.quantity - loc.reserved;
                          return (
                            <button
                              key={loc.locationId}
                              type="button"
                              onClick={() => onSuggestOrigin(loc.locationId)}
                              className={[
                                "flex items-center justify-between gap-3 w-full text-left rounded-xl border-2 px-4 transition-all",
                                "min-h-[48px] py-3",
                                isSelected
                                  ? "bg-amber-500/15 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30"
                                  : "bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 active:scale-[0.98]",
                              ].join(" ")}
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                  {loc.locationName}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 text-sm tabular-nums">
                                <span className="text-green-400 font-bold">
                                  {available} disp.
                                </span>
                                {loc.reserved > 0 && (
                                  <span className="text-amber-400/70 text-xs">
                                    {loc.reserved} res.
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {needsOrigin && (
                        <p className="text-xs text-amber-400 font-medium mt-1">
                          ↑ Toca una ubicación para definir el origen del traslado
                        </p>
                      )}
                    </div>
                  )}

                  {/* When no onSuggestOrigin (e.g. recepcion) just show info */}
                  {hasStock && !onSuggestOrigin && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Stock por ubicación:
                      </p>
                      {line.stockByLocation!.map((loc) => (
                        <div
                          key={loc.locationId}
                          className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                        >
                          <span className="text-slate-300 font-medium">
                            {loc.locationName}
                          </span>
                          <span className="tabular-nums">
                            <span className="text-green-400 font-semibold">{loc.quantity}</span>
                            {loc.reserved > 0 && (
                              <span className="text-amber-400 ml-1">({loc.reserved} res.)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {noStock && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2.5">
                      <span className="text-base">⚠</span>
                      Este producto no tiene stock en ninguna ubicación
                    </div>
                  )}
                </>
              )}

              {/* Quantity inputs */}
              {line.product_id > 0 && (
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-500 mb-1 block">Cantidad</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="1"
                      value={line.qty_demanded}
                      onChange={(e) =>
                        updateLine(line.id, {
                          qty_demanded: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={needsOrigin}
                      className="w-full text-center text-lg font-bold rounded-lg bg-slate-900 border border-slate-700 px-3 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-40 min-h-[48px]"
                    />
                  </div>
                  {showDone && (
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 mb-1 block">Recibido</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        value={line.qty_done}
                        onChange={(e) =>
                          updateLine(line.id, {
                            qty_done: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full text-center text-lg font-bold rounded-lg bg-slate-900 border border-slate-700 px-3 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[48px]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {lines.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-sm bg-slate-800/30 border border-dashed border-slate-700 rounded-xl">
            No hay productos. Agrega una línea para comenzar.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border border-dashed border-amber-500/30 rounded-xl py-3 min-h-[48px] transition-colors active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Agregar producto
      </button>
    </div>
  );
}
