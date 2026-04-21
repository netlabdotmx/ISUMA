"use client";

import { useMemo, useState } from "react";
import type { OdooLocation, OdooQuant } from "@/lib/odoo";
import {
  CIRCUITS,
  CIRCUIT_BY_ID,
  buildAerialColumns,
  parseCircuitLocation,
  hasManeuveringAtRack,
  type Circuit,
} from "@/lib/circuits";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface WarehouseLayoutProps {
  locations: OdooLocation[];
  quants: OdooQuant[];
  highlightedLocations: number[];
  highlightQuants: OdooQuant[];
  onRackClick: (circuitId: string, rackNumber: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build per-circuit stock totals from quants + locations */
function buildCircuitStats(
  locations: OdooLocation[],
  quants: OdooQuant[]
): Record<string, { totalQty: number; locationCount: number; productCount: number }> {
  const stats: Record<string, { totalQty: number; locs: Set<number>; prods: Set<number> }> = {};

  for (const c of CIRCUITS) {
    stats[c.id] = { totalQty: 0, locs: new Set(), prods: new Set() };
  }

  for (const q of quants) {
    if (q.quantity <= 0) continue;
    const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
    const loc = locations.find((l) => l.id === locId);
    if (!loc) continue;

    const circuit = resolveCircuit(loc);
    if (!circuit) continue;

    const s = stats[circuit.id];
    if (s) {
      s.totalQty += q.quantity;
      s.locs.add(locId);
      const prodId = Array.isArray(q.product_id) ? q.product_id[0] : 0;
      if (prodId) s.prods.add(prodId);
    }
  }

  const result: Record<string, { totalQty: number; locationCount: number; productCount: number }> = {};
  for (const [id, s] of Object.entries(stats)) {
    result[id] = { totalQty: s.totalQty, locationCount: s.locs.size, productCount: s.prods.size };
  }
  return result;
}

/** Build per-circuit highlight totals */
function buildCircuitHighlights(
  locations: OdooLocation[],
  highlightQuants: OdooQuant[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const q of highlightQuants) {
    if (q.quantity <= 0) continue;
    const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
    const loc = locations.find((l) => l.id === locId);
    if (!loc) continue;

    const circuit = resolveCircuit(loc);
    if (!circuit) continue;

    map[circuit.id] = (map[circuit.id] ?? 0) + q.quantity;
  }
  return map;
}

/** Resolve an Odoo location to its circuit */
function resolveCircuit(loc: OdooLocation): Circuit | null {
  // New format: "G 3-C1"
  const parsed = parseCircuitLocation(loc.name);
  if (parsed) return CIRCUIT_BY_ID[parsed.circuitId] ?? null;

  // Legacy format: "A-03-2" → aisle A
  const oldMatch = loc.name.match(/^([A-Z]{1,2})-\d+-\d+$/i);
  if (oldMatch) {
    const aisle = oldMatch[1].toLowerCase();
    return CIRCUIT_BY_ID[aisle] ?? null;
  }

  return null;
}

// ─── Pair color palette ──────────────────────────────────────────────────────

const PAIR_COLORS: Record<string, { bg: string; border: string; text: string }> = {};

function assignPairColors() {
  const palettes = [
    { bg: "bg-amber-500/20",   border: "border-amber-500/40",  text: "text-amber-300" },
    { bg: "bg-blue-500/20",    border: "border-blue-500/40",   text: "text-blue-300" },
    { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-300" },
    { bg: "bg-violet-500/20",  border: "border-violet-500/40", text: "text-violet-300" },
    { bg: "bg-pink-500/20",    border: "border-pink-500/40",   text: "text-pink-300" },
    { bg: "bg-orange-500/20",  border: "border-orange-500/40", text: "text-orange-300" },
    { bg: "bg-cyan-500/20",    border: "border-cyan-500/40",   text: "text-cyan-300" },
    { bg: "bg-lime-500/20",    border: "border-lime-500/40",   text: "text-lime-300" },
    { bg: "bg-rose-500/20",    border: "border-rose-500/40",   text: "text-rose-300" },
    { bg: "bg-indigo-500/20",  border: "border-indigo-500/40", text: "text-indigo-300" },
    { bg: "bg-teal-500/20",    border: "border-teal-500/40",   text: "text-teal-300" },
    { bg: "bg-purple-500/20",  border: "border-purple-500/40", text: "text-purple-300" },
    { bg: "bg-red-500/20",     border: "border-red-500/40",    text: "text-red-300" },
    { bg: "bg-sky-500/20",     border: "border-sky-500/40",    text: "text-sky-300" },
    { bg: "bg-yellow-500/20",  border: "border-yellow-500/40", text: "text-yellow-300" },
  ];

  // Group into pairs/singles for consistent coloring
  const groups: string[][] = [];
  const assigned = new Set<string>();

  for (const c of CIRCUITS) {
    if (assigned.has(c.id)) continue;
    assigned.add(c.id);
    if (c.pairedWith && !assigned.has(c.pairedWith)) {
      assigned.add(c.pairedWith);
      groups.push([c.id, c.pairedWith]);
    } else {
      groups.push([c.id]);
    }
  }

  groups.forEach((group, idx) => {
    const p = palettes[idx % palettes.length];
    for (const id of group) {
      PAIR_COLORS[id] = p;
    }
  });
}
assignPairColors();

// ─── Component ───────────────────────────────────────────────────────────────

export function WarehouseLayout({
  locations,
  quants,
  highlightedLocations,
  highlightQuants,
  onRackClick,
}: WarehouseLayoutProps) {
  const [focusedCircuit, setFocusedCircuit] = useState<string | null>(null);
  const aerialCols = useMemo(() => buildAerialColumns(), []);

  const circuitStats = useMemo(
    () => buildCircuitStats(locations, quants),
    [locations, quants]
  );

  const circuitHighlights = useMemo(
    () => buildCircuitHighlights(locations, highlightQuants),
    [locations, highlightQuants]
  );

  // Max rack count across all circuits for consistent row height
  const maxRacks = 10;

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Vista aérea — CEDIS ISUMA
        </span>
        <span className="text-[11px] text-slate-600">
          {CIRCUITS.length} circuitos · Clic para ver rack de frente
        </span>
      </div>

      {/* Orientation labels */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          ← Pared fondo
        </span>
        <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-widest">
          Frente (carga) →
        </span>
      </div>

      {/* Aerial grid — horizontal scroll */}
      <div className="px-4 pb-2 overflow-x-auto">
        <div className="inline-flex flex-col gap-0">
          {/* Circuit name labels (top) */}
          <div className="flex items-end gap-0">
            {aerialCols.map((col, i) => {
              if (col.type === "wall") {
                return (
                  <div key={`h-${i}`} className="w-3 shrink-0" />
                );
              }
              if (col.type === "aisle") {
                return <div key={`h-${i}`} className="w-5 shrink-0" />;
              }
              if (col.type === "separator") {
                return <div key={`h-${i}`} className="w-4 shrink-0" />;
              }
              // rack column
              const circuit = col.circuitId ? CIRCUIT_BY_ID[col.circuitId] : null;
              const hlQty = col.circuitId ? (circuitHighlights[col.circuitId] ?? 0) : 0;
              return (
                <div
                  key={`h-${i}`}
                  className="w-10 shrink-0 flex flex-col items-center"
                >
                  <span
                    className={cn(
                      "text-[7px] font-bold leading-none truncate max-w-full px-0.5 text-center",
                      hlQty > 0 ? "text-yellow-300" : "text-slate-500"
                    )}
                    title={circuit?.name}
                  >
                    {circuit?.name ?? ""}
                  </span>
                  <span className="text-[6px] text-slate-600 leading-none mt-0.5">
                    Zona {circuit?.zone ?? ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rack rows: from back (top) to front (bottom) */}
          {Array.from({ length: maxRacks }, (_, rackIdx) => {
            const rackNum = maxRacks - rackIdx; // 10 at top, 1 at bottom
            return (
              <div key={`r-${rackNum}`} className="flex items-center gap-0">
                {aerialCols.map((col, colIdx) => {
                  if (col.type === "wall") {
                    return (
                      <div
                        key={`c-${colIdx}`}
                        className="w-3 h-8 bg-slate-700 shrink-0"
                      />
                    );
                  }
                  if (col.type === "aisle") {
                    return (
                      <div
                        key={`c-${colIdx}`}
                        className="w-5 h-8 shrink-0 flex items-center justify-center"
                      >
                        {rackNum === Math.ceil(maxRacks / 2) && (
                          <div className="w-px h-4 bg-slate-800" />
                        )}
                      </div>
                    );
                  }
                  if (col.type === "separator") {
                    return (
                      <div
                        key={`c-${colIdx}`}
                        className="w-4 h-8 bg-slate-600/40 shrink-0 flex items-center justify-center"
                      >
                        <div className="w-0.5 h-full bg-slate-600" />
                      </div>
                    );
                  }

                  // Rack cell
                  const circuit = col.circuitId ? CIRCUIT_BY_ID[col.circuitId] : null;
                  if (!circuit || rackNum > circuit.rackCount) {
                    return (
                      <div
                        key={`c-${colIdx}`}
                        className="w-10 h-8 shrink-0 rounded-sm m-px bg-slate-900/50 border border-slate-800/30"
                      />
                    );
                  }

                  const cId = col.circuitId!;
                  const stats = circuitStats[cId];
                  const hlQty = circuitHighlights[cId] ?? 0;
                  const colors = PAIR_COLORS[cId] ?? {
                    bg: "bg-slate-700/50",
                    border: "border-slate-600",
                    text: "text-slate-400",
                  };

                  const hasStock = (stats?.totalQty ?? 0) > 0;
                  const isHighlighted = hlQty > 0;
                  const isFocused = focusedCircuit === cId;
                  const isPartialManeuvering = hasManeuveringAtRack(circuit, rackNum);

                  return (
                    <button
                      key={`c-${colIdx}`}
                      onClick={() => onRackClick(cId, rackNum)}
                      title={`Pasillo ${circuit.name} — Rack ${rackNum}${isPartialManeuvering ? " (maniobra nivel A)" : ""}`}
                      className={cn(
                        "w-10 h-8 shrink-0 rounded-sm m-px border text-[8px] font-bold relative",
                        "flex items-center justify-center transition-all duration-150",
                        "cursor-pointer hover:scale-110 hover:z-10 hover:shadow-lg hover:shadow-black/40",
                        isFocused
                          ? "ring-2 ring-white/70 ring-offset-1 ring-offset-slate-900 bg-white/15 border-white/50 text-white scale-105 z-10"
                          : isHighlighted
                            ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900 bg-yellow-400/25 border-yellow-400 text-yellow-200 animate-pulse"
                            : focusedCircuit && !isFocused
                              ? "opacity-20 border-slate-700/30"
                              : isPartialManeuvering
                                ? "bg-gradient-to-t from-blue-900/30 to-transparent border-blue-500/20 text-blue-300/70"
                                : hasStock
                                  ? `bg-green-900/40 border-green-600/40 text-green-300`
                                  : `${colors.bg} ${colors.border} ${colors.text}`
                      )}
                    >
                      {rackNum}
                      {isPartialManeuvering && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[5px] text-blue-400/50">↺</span>
                      )}
                    </button>
                  );
                })}

                {/* Row label (rack number) */}
                <div className="w-6 shrink-0 flex items-center justify-center">
                  <span className="text-[8px] text-slate-600 tabular-nums font-mono">
                    {rackNum}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Front label */}
          <div className="flex items-center mt-1">
            <div className="flex-1 h-px bg-red-500/30" />
            <span className="px-3 text-[9px] font-bold text-red-400/60 uppercase tracking-widest">
              Frente — Andén de carga
            </span>
            <div className="flex-1 h-px bg-red-500/30" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-900/50 border border-green-600/50" />
            <span className="text-slate-400">Con stock</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-400/25 border border-yellow-400" />
            <span className="text-slate-400">Producto buscado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-t from-blue-900/40 to-transparent border border-blue-500/20" />
            <span className="text-slate-400">Maniobra parcial (nivel A)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-700 border border-slate-600" />
            <span className="text-slate-400">Pared</span>
          </div>
        </div>
      </div>

      {/* Circuit quick-reference */}
      <div className="px-4 pb-4 border-t border-slate-800 pt-3">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
          Circuitos
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {CIRCUITS.map((c) => {
            const stats = circuitStats[c.id];
            const hlQty = circuitHighlights[c.id] ?? 0;
            const colors = PAIR_COLORS[c.id];
            return (
              <button
                key={c.id}
                onClick={() => setFocusedCircuit(focusedCircuit === c.id ? null : c.id)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-left transition-all hover:scale-105 active:scale-95",
                  focusedCircuit === c.id
                    ? "ring-2 ring-white/70 ring-offset-1 ring-offset-slate-900 border-white/50 bg-white/10"
                    : hlQty > 0
                      ? "border-yellow-400 bg-yellow-400/15"
                      : `${colors?.border ?? "border-slate-700"} ${colors?.bg ?? "bg-slate-800/40"}`
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-bold leading-none truncate",
                    hlQty > 0 ? "text-yellow-300" : (colors?.text ?? "text-slate-300")
                  )}
                >
                  {c.name}
                </p>
                <p className="text-[8px] text-slate-600 mt-0.5">
                  {stats?.totalQty ? `${Math.round(stats.totalQty)}u` : "vacío"}
                  {hlQty > 0 && (
                    <span className="text-yellow-400 ml-1">★{hlQty}</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
