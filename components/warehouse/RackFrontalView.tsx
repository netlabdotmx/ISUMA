"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Package, X } from "lucide-react";
import type { OdooLocation, OdooQuant } from "@/lib/odoo";
import {
  CIRCUIT_BY_ID,
  LEVELS,
  POSITIONS,
  parseCircuitLocation,
  buildCircuitLocationName,
  type Circuit,
} from "@/lib/circuits";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface RackFrontalViewProps {
  /** Circuit ID, e.g. "husky" */
  circuitId: string;
  /** Rack number within the circuit (1-based) */
  rackNumber: number;
  locations: OdooLocation[];
  quants: OdooQuant[];
  highlightedLocations: number[];
  highlightQuants: OdooQuant[];
  onBack: () => void;
  /** Navigate to another rack within the same circuit */
  onNavigateRack?: (rackNumber: number) => void;
}

interface CellData {
  position: number; // 1 (left) or 2 (right)
  level: string;
  locationId: number | null;
  locationName: string | null;
  totalQty: number;
  reservedQty: number;
  products: { id: number; name: string; qty: number }[];
  isHighlighted: boolean;
  highlightQty: number;
}

// ─── Resolve location → (rack, level, position) ─────────────────────────────

function resolveLocation(
  loc: OdooLocation,
  circuit: Circuit
): { rack: number; level: string; position: number } | null {
  // New format: "G 3-C1" or "G 3-C2" or legacy "G 3-C"
  const parsed = parseCircuitLocation(loc.name);
  if (parsed && parsed.circuitId === circuit.id) {
    return { rack: parsed.rack, level: parsed.level, position: parsed.position ?? 1 };
  }

  // Legacy format: "A-03-2" → aisle A, column 3, level 2
  const oldMatch = loc.name.match(/^([A-Z]{1,2})-(\d+)-(\d+)$/i);
  if (oldMatch) {
    const aisle = oldMatch[1].toLowerCase();
    if (aisle === circuit.id) {
      const col = parseInt(oldMatch[2]);
      const lvl = parseInt(oldMatch[3]);
      if (col > 0 && lvl > 0 && lvl <= 5) {
        return { rack: col, level: LEVELS[lvl - 1], position: 1 };
      }
    }
  }

  return null;
}

// ─── Level colors ────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  E: { bg: "bg-red-500/15",    border: "border-red-500/30",    text: "text-red-300",    label: "Nivel E — Tope" },
  D: { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-300", label: "Nivel D" },
  C: { bg: "bg-amber-500/15",  border: "border-amber-500/30",  text: "text-amber-300",  label: "Nivel C" },
  B: { bg: "bg-blue-500/15",   border: "border-blue-500/30",   text: "text-blue-300",   label: "Nivel B" },
  A: { bg: "bg-green-500/15",  border: "border-green-500/30",  text: "text-green-300",  label: "Nivel A — Piso" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function RackFrontalView({
  circuitId,
  rackNumber,
  locations,
  quants,
  highlightedLocations,
  highlightQuants,
  onBack,
  onNavigateRack,
}: RackFrontalViewProps) {
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);

  // Resolve circuit
  const circuit = useMemo(() => {
    return CIRCUIT_BY_ID[circuitId] ?? null;
  }, [circuitId]);

  // Build 2×5 grid for this specific rack
  const grid = useMemo(() => {
    if (!circuit) return [];

    // Build quant index by location ID
    const quantsByLoc: Record<number, OdooQuant[]> = {};
    for (const q of quants) {
      const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
      if (!quantsByLoc[locId]) quantsByLoc[locId] = [];
      quantsByLoc[locId].push(q);
    }

    // Highlight totals by location
    const hlByLoc: Record<number, number> = {};
    for (const q of highlightQuants) {
      const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
      hlByLoc[locId] = (hlByLoc[locId] ?? 0) + q.quantity;
    }

    // Index locations for THIS rack only: (level, position) → location
    const locIndex: Record<string, OdooLocation> = {};
    for (const loc of locations) {
      const resolved = resolveLocation(loc, circuit);
      if (resolved && resolved.rack === rackNumber) {
        locIndex[`${resolved.level}-${resolved.position}`] = loc;
      }
    }

    // Rows = levels (E top → A bottom), Cols = positions (1, 2)
    const rows: CellData[][] = [];
    for (let levelIdx = LEVELS.length - 1; levelIdx >= 0; levelIdx--) {
      const level = LEVELS[levelIdx];
      const row: CellData[] = [];

      for (const pos of POSITIONS) {
        const key = `${level}-${pos}`;
        const loc = locIndex[key] ?? null;
        const locId = loc?.id ?? null;
        const locQuants = locId ? (quantsByLoc[locId] ?? []) : [];

        const products: { id: number; name: string; qty: number }[] = [];
        let totalQty = 0;
        let reservedQty = 0;

        for (const q of locQuants) {
          if (q.quantity <= 0) continue;
          totalQty += q.quantity;
          reservedQty += q.reserved_quantity;
          const prodId = Array.isArray(q.product_id) ? q.product_id[0] : 0;
          const prodName = Array.isArray(q.product_id) ? q.product_id[1] : "—";
          const existing = products.find((p) => p.id === prodId);
          if (existing) existing.qty += q.quantity;
          else products.push({ id: prodId, name: prodName, qty: q.quantity });
        }

        row.push({
          position: pos,
          level,
          locationId: locId,
          locationName: loc?.name ?? null,
          totalQty,
          reservedQty,
          products,
          isHighlighted: locId !== null && highlightedLocations.includes(locId),
          highlightQty: locId ? (hlByLoc[locId] ?? 0) : 0,
        });
      }
      rows.push(row);
    }

    return rows;
  }, [circuit, rackNumber, locations, quants, highlightedLocations, highlightQuants]);

  if (!circuit) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>Circuito no encontrado: {circuitId}</p>
        <button onClick={onBack} className="mt-4 text-sm text-amber-400 underline">
          Volver
        </button>
      </div>
    );
  }

  const canGoPrev = rackNumber > 1;
  const canGoNext = rackNumber < circuit.rackCount;
  const paired = circuit.pairedWith ? CIRCUIT_BY_ID[circuit.pairedWith] : null;

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden max-w-sm mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h3 className="text-lg font-black text-slate-100 tracking-tight">
              PASILLO {circuit.name} — RACK {rackNumber}
            </h3>
            <p className="text-[11px] text-slate-500">
              Zona {circuit.zone}
              {paired && ` · Espalda con ${paired.name}`}
            </p>
          </div>
          {/* Empty spacer for centering */}
          <div className="w-[44px]" />
        </div>

        {/* Rack navigation */}
        {onNavigateRack && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <button
              disabled={!canGoPrev}
              onClick={() => canGoPrev && onNavigateRack(rackNumber - 1)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]",
                canGoPrev
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-800/30 text-slate-600 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Rack {rackNumber - 1}
            </button>
            <span className="text-xs text-slate-500 tabular-nums w-16 text-center">
              {rackNumber} / {circuit.rackCount}
            </span>
            <button
              disabled={!canGoNext}
              onClick={() => canGoNext && onNavigateRack(rackNumber + 1)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]",
                canGoNext
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-800/30 text-slate-600 cursor-not-allowed"
              )}
            >
              Rack {rackNumber + 1}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Frontal rack grid: 2 cols × 5 levels */}
      <div className="p-5">
        {/* Vertical rack frame */}
        <div className="border-2 border-slate-600 rounded-lg overflow-hidden">
          {grid.map((row, rowIdx) => {
            const level = LEVELS[LEVELS.length - 1 - rowIdx];
            const style = LEVEL_STYLE[level];

            return (
              <div
                key={level}
                className={cn(
                  "flex",
                  rowIdx > 0 && "border-t-2 border-slate-600"
                )}
              >
                {/* Position 1 (left) */}
                {row.map((cell, cellIdx) => (
                  <button
                    key={cell.position}
                    onClick={() => setSelectedCell(cell)}
                    title={buildCircuitLocationName(circuit.name, rackNumber, cell.level, cell.position)}
                    className={cn(
                      "flex-1 aspect-[4/3] min-h-[72px] relative",
                      "flex flex-col items-center justify-center gap-1",
                      "transition-all duration-150 cursor-pointer",
                      "hover:brightness-125 hover:z-10 active:scale-95",
                      cellIdx > 0 && "border-l-2 border-slate-600",
                      cell.highlightQty > 0
                        ? "bg-yellow-400/20 animate-pulse"
                        : cell.isHighlighted
                          ? "bg-yellow-400/10"
                          : cell.totalQty > 0
                            ? "bg-green-900/30"
                            : style.bg
                    )}
                  >
                    {/* Highlight ring */}
                    {(cell.highlightQty > 0 || cell.isHighlighted) && (
                      <div className="absolute inset-1 rounded border-2 border-yellow-400/60 pointer-events-none" />
                    )}

                    {cell.highlightQty > 0 ? (
                      <>
                        <span className="text-sm font-black text-yellow-300">
                          {cell.highlightQty}
                        </span>
                        <span className="text-[9px] text-yellow-400/80">★ buscado</span>
                      </>
                    ) : cell.totalQty > 0 ? (
                      <>
                        <Package className="h-4 w-4 text-green-400/60" />
                        <span className="text-sm font-bold text-green-300">
                          {Math.round(cell.totalQty)}
                        </span>
                        <span className="text-[8px] text-green-400/50">
                          {cell.products.length} SKU
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}

                    {/* Position label */}
                    <span className="absolute bottom-1 right-1.5 text-[7px] text-slate-600 font-mono">
                      {cell.position}
                    </span>
                  </button>
                ))}

                {/* Level label (right side) */}
                <div
                  className={cn(
                    "w-10 shrink-0 flex items-center justify-center border-l-2 border-slate-600",
                    style.bg
                  )}
                >
                  <span className={cn("text-base font-black", style.text)}>
                    {level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floor indicator */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-green-600/40 via-green-500/60 to-green-600/40" />
          <span className="text-[9px] font-bold text-green-500/60 uppercase tracking-widest">
            Piso
          </span>
          <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-green-600/40 via-green-500/60 to-green-600/40" />
        </div>

        {/* Level legend */}
        <div className="mt-4 grid grid-cols-5 gap-1">
          {[...LEVELS].reverse().map((level) => {
            const style = LEVEL_STYLE[level];
            return (
              <div
                key={level}
                className={cn(
                  "rounded px-1.5 py-1 text-center",
                  style.bg, style.border, "border"
                )}
              >
                <span className={cn("text-[9px] font-bold", style.text)}>
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cell detail drawer */}
      {selectedCell && (
        <div className="border-t border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-slate-100">
                  {buildCircuitLocationName(circuit.name, rackNumber, selectedCell.level, selectedCell.position)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 ml-6">
                Posición {selectedCell.position === 1 ? "izquierda" : "derecha"} ·{" "}
                {LEVEL_STYLE[selectedCell.level]?.label ?? `Nivel ${selectedCell.level}`}
              </p>
              {selectedCell.locationName && (
                <p className="text-[10px] text-slate-600 mt-0.5 ml-6 font-mono">
                  Odoo: {selectedCell.locationName}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          {selectedCell.products.length > 0 ? (
            <div className="mt-3 space-y-1.5 ml-6">
              {selectedCell.products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 bg-slate-800 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-200 truncate">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-100 tabular-nums shrink-0">
                    {p.qty} uds
                  </span>
                </div>
              ))}
              {selectedCell.reservedQty > 0 && (
                <p className="text-[11px] text-amber-400 ml-1">
                  {selectedCell.reservedQty} uds reservadas
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500 ml-6">
              Posición vacía — disponible para tarima
            </p>
          )}
        </div>
      )}
    </div>
  );
}
