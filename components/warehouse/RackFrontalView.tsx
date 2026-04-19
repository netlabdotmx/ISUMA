"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, MapPin, Package, X } from "lucide-react";
import type { OdooLocation, OdooQuant } from "@/lib/odoo";

const RACK_COLUMNS = 20;
const RACK_LEVELS = 5;

interface RackFrontalViewProps {
  /** Rack identifier — e.g. "A" (letter extracted from aerial label) */
  rackId: string;
  /** All warehouse locations from Odoo */
  locations: OdooLocation[];
  /** All quants loaded for the warehouse */
  quants: OdooQuant[];
  /** Location IDs currently highlighted by product search */
  highlightedLocations: number[];
  highlightQuants: OdooQuant[];
  /** Go back to aerial view */
  onBack: () => void;
}

interface CellData {
  col: number;
  level: number;
  locationId: number | null;
  locationName: string | null;
  totalQty: number;
  reservedQty: number;
  productCount: number;
  isHighlighted: boolean;
  highlightQty: number;
  products: { name: string; qty: number; reserved: number }[];
}

/**
 * Parse a location name to extract rack, column and level.
 * Supports multiple formats:
 *   "A-03-2"  → { rack: "A", col: 3, level: 2 }
 *   "A03-2"   → { rack: "A", col: 3, level: 2 }
 *   "A1B1"    → { rack: "A", col: 1, level: 1 }  (AisleXBayY → treat as rack X col Y)
 */
function parseLocationName(name: string): { rack: string; col: number; level: number } | null {
  // Standard: RACK-COL-LEVEL or RACKCOL-LEVEL
  const std = name.match(/^([A-Za-z]+)-?(\d{1,2})-(\d)$/);
  if (std) return { rack: std[1].toUpperCase(), col: parseInt(std[2], 10), level: parseInt(std[3], 10) };

  // Odoo-style: A1B1, A1B2, A2B3 etc. — Letter + digit + "B" + digit
  const odoo = name.match(/^([A-Za-z])(\d+)B(\d+)$/i);
  if (odoo) return { rack: odoo[1].toUpperCase(), col: parseInt(odoo[2], 10), level: parseInt(odoo[3], 10) };

  return null;
}

export function RackFrontalView({
  rackId,
  locations,
  quants,
  highlightedLocations,
  highlightQuants,
  onBack,
}: RackFrontalViewProps) {
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);

  // Index: locationId → quants
  const quantsByLocation = useMemo(() => {
    const idx: Record<number, OdooQuant[]> = {};
    for (const q of quants) {
      const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
      if (!idx[locId]) idx[locId] = [];
      idx[locId].push(q);
    }
    return idx;
  }, [quants]);

  // Index: locationId → highlight qty
  const highlightQtyByLoc = useMemo(() => {
    const idx: Record<number, number> = {};
    for (const q of highlightQuants) {
      const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
      idx[locId] = (idx[locId] ?? 0) + q.quantity;
    }
    return idx;
  }, [highlightQuants]);

  // Map (col, level) → OdooLocation for this rack
  const gridMap = useMemo(() => {
    const map: Record<string, OdooLocation> = {};
    const rackUpper = rackId.toUpperCase();

    for (const loc of locations) {
      // Try physical fields first
      const physRack = loc.x_physical_rack
        ? String(loc.x_physical_rack).toUpperCase()
        : null;
      const physCol = loc.x_physical_column
        ? Number(loc.x_physical_column)
        : null;
      const physLevel = loc.x_physical_level
        ? Number(loc.x_physical_level)
        : null;

      if (physRack === rackUpper && physCol && physLevel) {
        map[`${physCol}-${physLevel}`] = loc;
        continue;
      }

      // Fall back to name parsing
      const parsed = parseLocationName(loc.name);
      if (parsed && parsed.rack === rackUpper) {
        map[`${parsed.col}-${parsed.level}`] = loc;
      }
    }
    return map;
  }, [locations, rackId]);

  // Build full grid data
  const grid = useMemo(() => {
    const cells: CellData[][] = []; // [level][col]
    for (let level = RACK_LEVELS; level >= 1; level--) {
      const row: CellData[] = [];
      for (let col = 1; col <= RACK_COLUMNS; col++) {
        const loc = gridMap[`${col}-${level}`] ?? null;
        const locId = loc?.id ?? null;
        const locQuants = locId ? (quantsByLocation[locId] ?? []) : [];
        const products = locQuants.map((q) => ({
          name: Array.isArray(q.product_id) ? q.product_id[1] : "—",
          qty: q.quantity,
          reserved: q.reserved_quantity,
        }));
        const totalQty = products.reduce((s, p) => s + p.qty, 0);
        const reservedQty = products.reduce((s, p) => s + p.reserved, 0);
        const isHighlighted = locId !== null && highlightedLocations.includes(locId);
        const highlightQty = locId ? (highlightQtyByLoc[locId] ?? 0) : 0;

        row.push({
          col,
          level,
          locationId: locId,
          locationName: loc?.name ?? null,
          totalQty,
          reservedQty,
          productCount: locQuants.length,
          isHighlighted,
          highlightQty,
          products,
        });
      }
      cells.push(row);
    }
    return cells;
  }, [gridMap, quantsByLocation, highlightedLocations, highlightQtyByLoc]);

  const linkedCount = Object.keys(gridMap).length;
  const totalCells = RACK_COLUMNS * RACK_LEVELS;
  const cellsWithStock = grid.flat().filter((c) => c.totalQty > 0).length;

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al plano
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <div>
          <h3 className="text-lg font-bold text-slate-100 font-mono">
            Rack {rackId}
          </h3>
          <p className="text-xs text-slate-500">
            Vista frontal · {RACK_COLUMNS}×{RACK_LEVELS} · {linkedCount}/{totalCells} vinculadas · {cellsWithStock} con stock
          </p>
        </div>
      </div>

      {/* Rack frontal grid — scrollable horizontally */}
      <div className="p-4 overflow-x-auto">
        <div className="inline-block min-w-max">
          {/* Column headers */}
          <div className="flex items-end gap-0.5 mb-1">
            <div className="w-14 shrink-0" /> {/* spacer for level labels */}
            {Array.from({ length: RACK_COLUMNS }, (_, i) => (
              <div
                key={i}
                className="w-12 text-center text-[10px] text-slate-600 font-mono font-bold"
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Grid rows (top level first) */}
          {grid.map((row, rowIdx) => {
            const level = RACK_LEVELS - rowIdx;
            return (
              <div key={level} className="flex items-center gap-0.5 mb-0.5">
                {/* Level label */}
                <div className="w-14 shrink-0 flex items-center justify-end pr-2">
                  <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">
                    Nv {level}
                    {level === 1 && (
                      <span className="text-slate-600 ml-0.5">(P)</span>
                    )}
                  </span>
                </div>

                {/* Cells */}
                {row.map((cell) => {
                  const isLinked = cell.locationId !== null;
                  const isSelected = selectedCell?.col === cell.col && selectedCell?.level === cell.level;

                  return (
                    <button
                      key={cell.col}
                      onClick={() => isLinked && setSelectedCell(isSelected ? null : cell)}
                      disabled={!isLinked}
                      title={
                        isLinked
                          ? `${cell.locationName} — ${cell.totalQty} uds, ${cell.productCount} SKU`
                          : `${rackId}-${String(cell.col).padStart(2, "0")}-${cell.level} (sin vincular)`
                      }
                      className={[
                        "w-12 h-10 rounded border text-[9px] font-bold transition-all duration-150",
                        "flex flex-col items-center justify-center leading-none",
                        // Not linked
                        !isLinked &&
                          "border-dashed border-slate-700/50 bg-slate-800/20 text-slate-700 cursor-default",
                        // Highlighted (search result)
                        isLinked && cell.isHighlighted &&
                          "border-yellow-400 bg-yellow-400/20 text-yellow-200 ring-1 ring-yellow-400/40 animate-pulse cursor-pointer",
                        // With stock
                        isLinked && !cell.isHighlighted && cell.totalQty > 0 &&
                          "border-green-600/60 bg-green-900/40 text-green-300 hover:bg-green-800/50 cursor-pointer",
                        // Linked but empty
                        isLinked && !cell.isHighlighted && cell.totalQty === 0 &&
                          "border-slate-600/60 bg-slate-800/40 text-slate-500 hover:bg-slate-700/50 cursor-pointer",
                        // Selected
                        isSelected && "ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {cell.isHighlighted && cell.highlightQty > 0 ? (
                        <span className="text-[10px] font-bold">{cell.highlightQty}</span>
                      ) : cell.totalQty > 0 ? (
                        <span className="text-[10px] tabular-nums">{cell.totalQty}</span>
                      ) : isLinked ? (
                        <span className="text-[8px]">—</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Floor indicator */}
          <div className="flex items-center gap-0.5 mt-1">
            <div className="w-14 shrink-0" />
            <div className="flex-1 border-t-2 border-slate-600 pt-1.5 flex items-center gap-2">
              <MapPin className="h-3 w-3 text-slate-600" />
              <span className="text-[10px] text-slate-600 font-medium">
                PISO DEL ALMACÉN
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected cell detail */}
      {selectedCell && (
        <div className="mx-4 mb-4 rounded-lg bg-slate-800/60 border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-mono">
                {selectedCell.locationName}
              </h4>
              <p className="text-[11px] text-slate-500">
                Columna {selectedCell.col} · Nivel {selectedCell.level} · {selectedCell.productCount} SKU
              </p>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="p-1.5 text-slate-500 hover:text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedCell.products.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Ubicación vacía</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {selectedCell.products.map((prod, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-200 truncate text-xs">{prod.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-green-400 font-bold tabular-nums text-xs">
                      {prod.qty}
                    </span>
                    {prod.reserved > 0 && (
                      <span className="text-amber-400 text-[10px] tabular-nums">
                        ({prod.reserved} res.)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-green-600/60 bg-green-900/40" />
            <span className="text-slate-400">Con stock</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-slate-600/60 bg-slate-800/40" />
            <span className="text-slate-400">Vacío</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-dashed border-slate-700/50 bg-slate-800/20" />
            <span className="text-slate-400">Sin vincular</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-yellow-400 bg-yellow-400/20" />
            <span className="text-slate-400">Búsqueda</span>
          </div>
        </div>
      </div>
    </div>
  );
}
