"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MousePointer2,
  Eraser,
  Save,
  RotateCcw,
  X,
  Layers,
  Minus,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
type CellType = "empty" | "rack" | "aisle" | "wall";
type Tool = "select" | "rack" | "aisle" | "wall" | "erase";
type Zone = "A" | "B" | "C" | "D" | "none";

export interface EditorCell {
  type: CellType;
  label?: string;
  capacity?: number;
  zone?: Zone;
  locationId?: number | null;
  locationName?: string;
}

export type EditorGrid = EditorCell[][];

// ─── Constants ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "isuma-warehouse-layout-v1";
const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 15;
const MIN_ROWS = 4;
const MIN_COLS = 4;
const MAX_ROWS = 30;
const MAX_COLS = 30;
const CELL_SIZE = 38; // px

// ─── Helpers ───────────────────────────────────────────────────────────────────
function makeEmptyGrid(rows: number, cols: number): EditorGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): EditorCell => ({ type: "empty" }))
  );
}

function resizeGrid(
  grid: EditorGrid,
  newRows: number,
  newCols: number
): EditorGrid {
  const result = makeEmptyGrid(newRows, newCols);
  const maxR = Math.min(grid.length, newRows);
  const maxC = Math.min(grid[0]?.length ?? 0, newCols);
  for (let r = 0; r < maxR; r++) {
    for (let c = 0; c < maxC; c++) {
      result[r][c] = { ...grid[r][c] };
    }
  }
  return result;
}

function autoLabel(r: number, c: number): string {
  const rowLabel = String.fromCharCode(65 + (r % 26)); // A, B, C, ...
  const col = String(c + 1).padStart(2, "0");
  return `${rowLabel}${col}`;
}

// ─── Zone styles ───────────────────────────────────────────────────────────────
const ZONE_CELL: Record<Zone, string> = {
  A: "bg-amber-500 border-amber-400 text-amber-950",
  B: "bg-blue-500 border-blue-400 text-white",
  C: "bg-emerald-500 border-emerald-400 text-emerald-950",
  D: "bg-violet-500 border-violet-400 text-white",
  none: "bg-slate-500 border-slate-400 text-white",
};

// ─── Tool definitions ──────────────────────────────────────────────────────────
interface ToolDef {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  description: string;
}

const TOOLS: Record<Tool, ToolDef> = {
  select: {
    label: "Seleccionar",
    Icon: MousePointer2,
    shortcut: "S",
    description: "Clic en un rack para editar sus propiedades",
  },
  rack: {
    label: "Rack",
    Icon: Layers,
    shortcut: "R",
    description: "Dibuja posiciones de almacenamiento",
  },
  aisle: {
    label: "Pasillo",
    Icon: Minus,
    shortcut: "A",
    description: "Dibuja pasillos de circulación",
  },
  wall: {
    label: "Muro",
    Icon: Square,
    shortcut: "W",
    description: "Dibuja muros y límites del almacén",
  },
  erase: {
    label: "Borrar",
    Icon: Eraser,
    shortcut: "E",
    description: "Elimina celdas",
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export function LayoutEditor() {
  const [grid, setGrid] = useState<EditorGrid>(() => {
    if (typeof window === "undefined")
      return makeEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.grid) && parsed.grid.length > 0)
          return parsed.grid as EditorGrid;
      }
    } catch {}
    return makeEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS);
  });

  const [tool, setTool] = useState<Tool>("rack");
  const [isPainting, setIsPainting] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);

  // Odoo locations combobox
  const [odooLocations, setOdooLocations] = useState<{ id: number; name: string; complete_name: string }[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);
  const locDropdownRef = useRef<HTMLDivElement>(null);

  const rows = grid.length;
  const cols = grid[0]?.length ?? DEFAULT_COLS;

  // ── Paint ────────────────────────────────────────────────────────────────────
  const paintCell = useCallback(
    (r: number, c: number) => {
      setGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })));
        const current = next[r][c];

        if (tool === "erase") {
          next[r][c] = { type: "empty" };
          return next;
        }
        if (tool === "rack") {
          next[r][c] = {
            type: "rack",
            label:
              current.type === "rack" ? current.label : autoLabel(r, c),
            capacity:
              current.type === "rack" ? current.capacity : 100,
            zone: current.type === "rack" ? current.zone : "none",
            locationId: current.type === "rack" ? current.locationId ?? null : null,
            locationName: current.type === "rack" ? current.locationName : "",
          };
          return next;
        }
        if (tool === "aisle") {
          next[r][c] = { type: "aisle" };
          return next;
        }
        if (tool === "wall") {
          next[r][c] = { type: "wall" };
          return next;
        }
        return next;
      });
    },
    [tool]
  );

  // ── Mouse events ─────────────────────────────────────────────────────────────
  const handleCellDown = useCallback(
    (r: number, c: number) => {
      if (tool === "select") {
        const cell = grid[r][c];
        setSelectedCell(cell.type !== "empty" ? { row: r, col: c } : null);
        return;
      }
      setIsPainting(true);
      paintCell(r, c);
    },
    [tool, grid, paintCell]
  );

  const handleCellEnter = useCallback(
    (r: number, c: number) => {
      if (!isPainting || tool === "select") return;
      paintCell(r, c);
    },
    [isPainting, tool, paintCell]
  );

  useEffect(() => {
    const stop = () => setIsPainting(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  // ── Load Odoo locations ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/odoo/locations?warehouse_id=1")
      .then((r) => r.json())
      .then((d) => setOdooLocations(d.locations ?? []))
      .catch(() => {});
  }, []);

  // Sync locationQuery when selectedCell changes
  useEffect(() => {
    setLocDropdownOpen(false);
    if (!selectedCell) { setLocationQuery(""); return; }
    const cell = grid[selectedCell.row]?.[selectedCell.col];
    setLocationQuery(
      cell?.type === "rack" ? (cell.locationName ?? cell.label ?? "") : ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell]);

  // Close dropdown on outside click
  useEffect(() => {
    function outside(e: MouseEvent) {
      if (locDropdownRef.current && !locDropdownRef.current.contains(e.target as Node))
        setLocDropdownOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const save = useCallback((g: EditorGrid) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ grid: g, savedAt: Date.now() })
      );
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2000);
    } catch {}
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save(grid);
        return;
      }
      const map: Record<string, Tool> = {
        s: "select",
        r: "rack",
        a: "aisle",
        w: "wall",
        e: "erase",
      };
      const t = map[e.key.toLowerCase()];
      if (t) setTool(t);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [grid, save]);

  // ── Patch selected cell ───────────────────────────────────────────────────────
  function patchSelected(patch: Partial<EditorCell>) {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    setGrid((prev) => {
      const next = prev.map((r) => r.map((c) => ({ ...c })));
      next[row][col] = { ...next[row][col], ...patch };
      return next;
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const flat = grid.flat();
  const rackCount = flat.filter((c) => c.type === "rack").length;
  const aisleCount = flat.filter((c) => c.type === "aisle").length;
  const totalCap = flat
    .filter((c) => c.type === "rack")
    .reduce((s, c) => s + (c.capacity ?? 0), 0);

  const selData = selectedCell
    ? grid[selectedCell.row][selectedCell.col]
    : null;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-slate-800 select-none bg-slate-950">
      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-900 border-b border-slate-800">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {(Object.entries(TOOLS) as [Tool, ToolDef][]).map(([t, cfg]) => {
            const { Icon } = cfg;
            return (
              <button
                key={t}
                title={`${cfg.label} — ${cfg.description} (${cfg.shortcut})`}
                onClick={() => setTool(t)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  tool === t
                    ? "bg-amber-500 text-slate-900 shadow-md shadow-amber-500/25"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{cfg.label}</span>
                <kbd className="hidden lg:inline text-[9px] opacity-40 font-mono bg-black/20 px-0.5 rounded">
                  {cfg.shortcut}
                </kbd>
              </button>
            );
          })}
        </div>

        {/* Right: stats + actions */}
        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-500 border-r border-slate-800 pr-3 mr-1">
            <span>
              <span className="text-amber-400 font-bold">{rackCount}</span>{" "}
              racks
            </span>
            <span>
              <span className="text-sky-400 font-bold">{aisleCount}</span>{" "}
              pasillos
            </span>
            <span>
              <span className="text-slate-300 font-bold">
                {totalCap.toLocaleString()}
              </span>{" "}
              uds. cap.
            </span>
            <span>
              <span className="text-slate-300 font-bold">{rows}×{cols}</span>{" "}
              celdas
            </span>
          </div>

          {/* Save */}
          <button
            onClick={() => save(grid)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              saveFlash
                ? "bg-green-600 text-white shadow-md shadow-green-600/30"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {saveFlash ? "¡Guardado ✓" : "Guardar"}
          </button>

          {/* Resize */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 border-l border-slate-800 pl-2 ml-1">
            <span className="font-medium">Filas</span>
            <button
              onClick={() => {
                if (rows > MIN_ROWS) {
                  setGrid((g) => resizeGrid(g, rows - 1, cols));
                  setSelectedCell(null);
                }
              }}
              disabled={rows <= MIN_ROWS}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-30"
            >−</button>
            <span className="font-bold text-slate-300 w-5 text-center">{rows}</span>
            <button
              onClick={() => {
                if (rows < MAX_ROWS) {
                  setGrid((g) => resizeGrid(g, rows + 1, cols));
                  setSelectedCell(null);
                }
              }}
              disabled={rows >= MAX_ROWS}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-30"
            >+</button>
            <span className="font-medium ml-2">Col</span>
            <button
              onClick={() => {
                if (cols > MIN_COLS) {
                  setGrid((g) => resizeGrid(g, rows, cols - 1));
                  setSelectedCell(null);
                }
              }}
              disabled={cols <= MIN_COLS}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-30"
            >−</button>
            <span className="font-bold text-slate-300 w-5 text-center">{cols}</span>
            <button
              onClick={() => {
                if (cols < MAX_COLS) {
                  setGrid((g) => resizeGrid(g, rows, cols + 1));
                  setSelectedCell(null);
                }
              }}
              disabled={cols >= MAX_COLS}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-30"
            >+</button>
          </div>

          {/* Clear */}
          <button
            onClick={() => {
              if (
                window.confirm(
                  "¿Limpiar todo el layout? Esta acción no se puede deshacer."
                )
              ) {
                setGrid(makeEmptyGrid(rows, cols));
                setSelectedCell(null);
              }
            }}
            title="Limpiar toda la cuadrícula"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:bg-red-900/50 hover:text-red-300 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        </div>
      </div>

      {/* ── Grid area + Properties panel ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Grid */}
        <div
          className="flex-1 overflow-auto p-4"
          style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        >
          {/* Legend */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {(["A", "B", "C", "D", "none"] as Zone[]).map((z) => (
              <div
                key={z}
                className="flex items-center gap-1.5 text-[11px] text-slate-500"
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded border-2",
                    ZONE_CELL[z]
                  )}
                />
                {z === "none" ? "Sin zona" : `Zona ${z}`}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded border-2 border-dashed border-slate-600 bg-slate-700/20" />
              Pasillo
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded border-2 border-slate-700 bg-slate-800" />
              Muro
            </div>
          </div>

          {/* Grid */}
          <div
            className="inline-grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
            }}
            onMouseLeave={() => setIsPainting(false)}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isSelected =
                  selectedCell?.row === r && selectedCell?.col === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCellDown(r, c);
                    }}
                    onMouseEnter={() => handleCellEnter(r, c)}
                    className={cn(
                      "rounded border-2 flex flex-col items-center justify-center text-[9px] font-bold overflow-hidden transition-colors duration-75",
                      // empty
                      cell.type === "empty" &&
                        "bg-slate-900 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-800/60",
                      // rack
                      cell.type === "rack" &&
                        cn(
                          ZONE_CELL[cell.zone ?? "none"],
                          "hover:brightness-110 shadow-sm cursor-pointer"
                        ),
                      // aisle
                      cell.type === "aisle" &&
                        "bg-slate-700/10 border-dashed border-slate-600/50",
                      // wall
                      cell.type === "wall" &&
                        "bg-slate-800 border-slate-700",
                      // selected
                      isSelected &&
                        "ring-2 ring-amber-400 ring-offset-[2px] ring-offset-slate-950 brightness-110"
                    )}
                  >
                    {cell.type === "rack" && (
                      <>
                        <span className="leading-none truncate max-w-full px-0.5">
                          {cell.label ?? "—"}
                        </span>
                        {(cell.capacity ?? 0) > 0 && (
                          <span className="text-[7px] opacity-60 mt-0.5 leading-none font-normal">
                            {cell.capacity}u
                          </span>
                        )}
                      </>
                    )}
                    {cell.type === "aisle" && (
                      <span className="text-[8px] text-slate-600 leading-none">
                        ↕
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Properties panel ─────────────────────────────────────────────────── */}
        {selData && selData.type !== "empty" && selectedCell && (
          <div className="w-56 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto inv-scroll">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Propiedades
              </span>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {selData.type === "rack" ? (
                <>
                  {/* Label / Ubicación Odoo */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                      Ubicación Odoo
                    </label>
                    <div className="relative" ref={locDropdownRef}>
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLocationQuery(v);
                          patchSelected({
                            label: v,
                            locationName: v,
                            locationId: null,
                          });
                          setLocDropdownOpen(true);
                        }}
                        onFocus={() => setLocDropdownOpen(true)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="Buscar ubicación…"
                      />
                      {locDropdownOpen && (() => {
                        const q = locationQuery.toLowerCase();
                        const filtered = odooLocations.filter(
                          (l) =>
                            l.name.toLowerCase().includes(q) ||
                            l.complete_name.toLowerCase().includes(q)
                        ).slice(0, 30);
                        return filtered.length > 0 ? (
                          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg overflow-auto max-h-44 shadow-2xl">
                            {filtered.map((loc) => (
                              <button
                                key={loc.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  patchSelected({
                                    label: loc.name,
                                    locationName: loc.name,
                                    locationId: loc.id,
                                  });
                                  setLocationQuery(loc.name);
                                  setLocDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors flex flex-col gap-0.5 border-b border-slate-700/50 last:border-0"
                              >
                                <span className="font-semibold text-slate-200">{loc.name}</span>
                                <span className="text-slate-500 text-[10px] truncate">{loc.complete_name}</span>
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {odooLocations.length === 0 && (
                      <p className="text-[10px] text-slate-600 mt-1">Cargando ubicaciones…</p>
                    )}
                    {selData.locationId ? (
                      <p className="text-[10px] text-emerald-400 mt-1">
                        Vinculada a Odoo ID #{selData.locationId}
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-400 mt-1">
                        Sin vínculo Odoo explícito
                      </p>
                    )}
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                      Capacidad (unidades)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={selData.capacity ?? 0}
                      onChange={(e) =>
                        patchSelected({
                          capacity: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* Zone */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-2">
                      Zona / Clasificación
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(["A", "B", "C", "D", "none"] as Zone[]).map((z) => (
                        <button
                          key={z}
                          onClick={() => patchSelected({ zone: z })}
                          className={cn(
                            "py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all",
                            selData.zone === z
                              ? "scale-110 shadow-md"
                              : "opacity-40 hover:opacity-80",
                            ZONE_CELL[z]
                          )}
                        >
                          {z === "none" ? "—" : z}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2">
                      Clasifica por frecuencia de movimiento (A = alta rotación)
                    </p>
                  </div>

                  {/* Position */}
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[10px] text-slate-600">
                      Fila {String.fromCharCode(65 + selectedCell.row)} · Columna {selectedCell.col + 1}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500 text-center py-6 space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-slate-800 flex items-center justify-center">
                    {selData.type === "aisle" ? (
                      <Minus className="h-5 w-5 text-slate-600" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  <p className="font-medium text-slate-400">
                    {selData.type === "aisle" ? "Pasillo" : "Muro"}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Usa la herramienta{" "}
                    <span className="text-red-400">Borrar</span> para eliminar
                    esta celda.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Hint bar ─────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 py-1.5 bg-slate-900/60 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          💡 Arrastra para pintar ·{" "}
          <kbd className="bg-slate-800 px-1 rounded text-slate-500">S</kbd> seleccionar ·{" "}
          <kbd className="bg-slate-800 px-1 rounded text-slate-500">R</kbd> rack ·{" "}
          <kbd className="bg-slate-800 px-1 rounded text-slate-500">A</kbd> pasillo ·{" "}
          <kbd className="bg-slate-800 px-1 rounded text-slate-500">W</kbd> muro ·{" "}
          <kbd className="bg-slate-800 px-1 rounded text-slate-500">E</kbd> borrar ·{" "}
          <kbd className="bg-slate-800 px-1 rounded text-slate-500">Ctrl+S</kbd> guardar
        </p>
      </div>
    </div>
  );
}
