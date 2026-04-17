"use client";

import { useMemo, useState, useEffect } from "react";
import { RackCell, type RackCellData } from "./RackCell";
import type { OdooLocation, OdooQuant } from "@/lib/odoo";
import type { EditorGrid } from "./LayoutEditor";

const STORAGE_KEY = "isuma-warehouse-layout-v1";

// Known location name → ID mapping from Odoo data
const LOCATION_NAME_MAP: Record<string, number> = {
  A1B1: 15,
  A1B2: 13,
  A1B3: 14,
  A1B4: 16,
  A2B1: 17,
};

const CEDIS_LAYOUT = {
  aisles: [
    { id: "A1", label: "Pasillo A1", bays: ["A1B1", "A1B2", "A1B3", "A1B4"] },
    { id: "A2", label: "Pasillo A2", bays: ["A2B1", "A2B2", "A2B3", "A2B4"] },
    { id: "A3", label: "Pasillo A3", bays: ["A3B1", "A3B2", "A3B3", "A3B4"] },
  ],
};

interface WarehouseLayoutProps {
  locations: OdooLocation[];
  quants: OdooQuant[];
  highlightedLocations: number[];
  highlightQuants: OdooQuant[];
  onLocationClick: (data: RackCellData) => void;
}

function computeABC(quants: OdooQuant[]): Record<number, "A" | "B" | "C"> {
  const totals: Record<number, number> = {};
  for (const q of quants) {
    const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
    totals[locId] = (totals[locId] ?? 0) + q.quantity;
  }

  const sorted = Object.entries(totals)
    .map(([id, qty]) => ({ id: parseInt(id), qty }))
    .sort((a, b) => b.qty - a.qty);

  const result: Record<number, "A" | "B" | "C"> = {};
  const third = Math.ceil(sorted.length / 3);
  sorted.forEach((item, idx) => {
    if (idx < third) result[item.id] = "A";
    else if (idx < third * 2) result[item.id] = "B";
    else result[item.id] = "C";
  });
  return result;
}

// Read the editor grid from localStorage (client-side only)
function loadEditorGrid(): EditorGrid | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.grid) ? (parsed.grid as EditorGrid) : null;
  } catch {
    return null;
  }
}

export function WarehouseLayout({
  locations,
  quants,
  highlightedLocations,
  highlightQuants,
  onLocationClick,
}: WarehouseLayoutProps) {
  // Re-read editor grid from localStorage whenever the component renders
  const [editorGrid, setEditorGrid] = useState<EditorGrid | null>(null);

  useEffect(() => {
    setEditorGrid(loadEditorGrid());
  }, []);

  const abcClassification = useMemo(() => computeABC(quants), [quants]);

  // Build quants index by location ID
  const quantsByLocation = useMemo(() => {
    const idx: Record<number, OdooQuant[]> = {};
    for (const q of quants) {
      const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
      if (!idx[locId]) idx[locId] = [];
      idx[locId].push(q);
    }
    return idx;
  }, [quants]);

  // Build highlight quants index
  const highlightQtyByLocation = useMemo(() => {
    const idx: Record<number, { qty: number; reserved: number }> = {};
    for (const q of highlightQuants) {
      const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
      idx[locId] = {
        qty: (idx[locId]?.qty ?? 0) + q.quantity,
        reserved: (idx[locId]?.reserved ?? 0) + q.reserved_quantity,
      };
    }
    return idx;
  }, [highlightQuants]);

  function buildCellData(label: string, locationId: number | null): RackCellData {
    const locQuants = locationId ? (quantsByLocation[locationId] ?? []) : [];
    const totalQty = locQuants.reduce((s, q) => s + q.quantity, 0);
    const isHighlighted = locationId !== null && highlightedLocations.includes(locationId);
    const hlData = locationId ? highlightQtyByLocation[locationId] : undefined;

    return {
      locationId,
      label,
      abcClass: locationId ? (abcClassification[locationId] ?? null) : null,
      totalQty,
      productCount: locQuants.length,
      isHighlighted,
      highlightQty: hlData?.qty,
      highlightReserved: hlData?.reserved,
    };
  }

  // ── Editor grid view ──────────────────────────────────────────────────────────
  if (editorGrid && editorGrid.length > 0) {
    const ZONE_BG: Record<string, string> = {
      A: "bg-amber-500/20 border-amber-500/40 text-amber-300",
      B: "bg-blue-500/20 border-blue-500/40 text-blue-300",
      C: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
      D: "bg-violet-500/20 border-violet-500/40 text-violet-300",
      none: "bg-slate-700/50 border-slate-600 text-slate-400",
    };

    return (
      <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Plano del CEDIS — Editor
          </span>
          <span className="text-[11px] text-slate-600">
            {editorGrid.length} × {editorGrid[0]?.length ?? 0} celdas
          </span>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="inline-flex flex-col gap-0.5">
            {editorGrid.map((row, r) => (
              <div key={r} className="flex gap-0.5">
                {row.map((cell, c) => {
                  if (cell.type === "empty") {
                    return (
                      <div
                        key={c}
                        className="w-9 h-9 rounded border border-transparent"
                      />
                    );
                  }
                  if (cell.type === "aisle") {
                    return (
                      <div
                        key={c}
                        className="w-9 h-9 rounded border border-slate-700/40 bg-slate-800/20 flex items-center justify-center"
                      >
                        <span className="text-[9px] text-slate-600 font-bold rotate-90 tracking-widest">
                          PASILLO
                        </span>
                      </div>
                    );
                  }
                  if (cell.type === "wall") {
                    return (
                      <div
                        key={c}
                        className="w-9 h-9 rounded border border-slate-600 bg-slate-700"
                      />
                    );
                  }
                  // rack
                  const label = cell.label ?? `R${r}${c}`;
                  const zone = cell.zone ?? "none";
                  const locationId = LOCATION_NAME_MAP[label] ?? null;
                  const cellData = buildCellData(label, locationId);
                  const zoneCls = ZONE_BG[zone];

                  return (
                    <button
                      key={c}
                      onClick={() => onLocationClick(cellData)}
                      title={`${label}${cell.capacity ? ` · Cap: ${cell.capacity}` : ""}`}
                      className={[
                        "w-9 h-9 rounded border text-[9px] font-bold transition-all duration-150",
                        "flex items-center justify-center leading-none",
                        cellData.isHighlighted
                          ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900"
                          : "",
                        cellData.totalQty > 0
                          ? "bg-green-900/50 border-green-600/60 text-green-300"
                          : zoneCls,
                        "hover:scale-105 hover:z-10 hover:shadow-lg hover:shadow-black/40",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-900/50 border border-green-600/60" />
              <span className="text-slate-400">Con stock</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
              <span className="text-slate-400">Zona A</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" />
              <span className="text-slate-400">Zona B</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span className="text-slate-400">Zona C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-violet-500/20 border border-violet-500/40" />
              <span className="text-slate-400">Zona D</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-400" />
              <span className="text-slate-400">Búsqueda activa</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Fallback: hardcoded CEDIS layout ─────────────────────────────────────────
  function buildCellDataByName(bayName: string): RackCellData {
    const locationId = LOCATION_NAME_MAP[bayName] ?? null;
    return buildCellData(bayName, locationId);
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
      {/* Zone header bar */}
      <div className="grid grid-cols-4 border-b border-slate-700 text-xs font-semibold text-slate-400">
        <div className="px-4 py-2.5 border-r border-slate-700 bg-slate-800/60">OFICINAS</div>
        <div className="px-4 py-2.5 border-r border-slate-700 bg-slate-800/40">ZONA DESCARGA</div>
        <div className="px-4 py-2.5 border-r border-slate-700 bg-slate-800/40">ZONA DE CARGA</div>
        <div className="px-4 py-2.5 bg-slate-800/60">ANDENES</div>
      </div>

      {/* Main warehouse body */}
      <div className="flex p-4 gap-4">
        {/* Rack aisles */}
        <div className="flex-1 space-y-3">
          {/* Pasillo principal label */}
          <div className="text-xs text-slate-500 font-medium uppercase tracking-widest text-center pb-1 border-b border-slate-700/60">
            ═══ PASILLO PRINCIPAL ═══
          </div>

          {CEDIS_LAYOUT.aisles.map((aisle) => (
            <div key={aisle.id} className="flex items-center gap-2">
              <div className="w-16 text-xs text-slate-500 font-semibold shrink-0 text-right pr-2">
                {aisle.label}
              </div>
              <div className="flex-1 flex gap-2 flex-wrap">
                {aisle.bays.map((bay) => {
                  const cellData = buildCellDataByName(bay);
                  return (
                    <RackCell
                      key={bay}
                      data={cellData}
                      onClick={onLocationClick}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pasillo seguro label */}
          <div className="text-xs text-slate-500 font-medium uppercase tracking-widest text-center pt-1 border-t border-slate-700/60">
            ═══ PASILLO SEGURO ═══
          </div>
        </div>

        {/* Right zone: Cross docking + Andenes */}
        <div className="flex flex-col gap-3 w-28 shrink-0">
          <div className="flex-1 rounded-lg bg-slate-800/60 border border-slate-700 flex flex-col items-center justify-center p-3 text-center">
            <span className="text-xs font-semibold text-slate-400 leading-tight">
              CROSS DOCKING
            </span>
          </div>
          <div className="flex-1 rounded-lg bg-slate-800/40 border border-slate-700 flex flex-col items-center justify-center p-3 text-center">
            <span className="text-xs font-semibold text-slate-400 leading-tight">
              ANDENES
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-600" />
            <span className="text-slate-400">Clase A — Alta rotación</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-slate-400">Clase B — Rotación media</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-700" />
            <span className="text-slate-400">Clase C — Baja rotación</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-400" />
            <span className="text-slate-400">Resultado de búsqueda</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-700/50" />
            <span className="text-slate-400">Disponible / No asignado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
