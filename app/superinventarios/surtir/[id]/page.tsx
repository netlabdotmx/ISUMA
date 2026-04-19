"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  MapPin,
  Package,
  SkipForward,
  ScanBarcode,
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  Map,
  X,
} from "lucide-react";
import { optimizePickingRoute } from "@/lib/picking";
import * as feedback from "@/lib/feedback";
import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { RackFrontalView } from "@/components/warehouse/RackFrontalView";
import type { OdooLocation, OdooQuant } from "@/lib/odoo";

/* ────────── types ────────── */

interface PickingDetail {
  id: number;
  name: string;
  state: string;
  partner_id?: [number, string] | false;
  origin?: string | false;
  priority?: string;
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

interface EnrichedMove extends MoveDetail {
  barcode: string | null;
  default_code: string | null;
  qty_done: number; // local tracked
  physicalPos: string | null;
}

/* ────────── component ────────── */

export default function SurtirDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  const [pickingId, setPickingId] = useState<number | null>(null);
  const [picking, setPicking] = useState<PickingDetail | null>(null);
  const [moves, setMoves] = useState<EnrichedMove[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [scanFeedback, setScanFeedback] = useState<"success" | "error" | null>(null);
  const [scanBuffer, setScanBuffer] = useState("");

  /* ── map overlay state ── */
  const [showMap, setShowMap] = useState(false);
  const [mapRack, setMapRack] = useState<string | null>(null);
  const [locations, setLocations] = useState<OdooLocation[]>([]);
  const [allQuants, setAllQuants] = useState<OdooQuant[]>([]);
  const [productQuants, setProductQuants] = useState<OdooQuant[]>([]);
  const [highlightLocIds, setHighlightLocIds] = useState<number[]>([]);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then(({ id }) => setPickingId(parseInt(id)));
  }, [params]);

  /* ── fetch picking + moves + product barcodes ── */
  useEffect(() => {
    if (pickingId === null) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/odoo/pickings/${pickingId}`);
        if (!res.ok) throw new Error("No se pudo cargar el pedido");
        const data = await res.json();

        const pickingData: PickingDetail = data.picking;
        const movesData: MoveDetail[] = data.moves;

        // Fetch product barcodes and location physical positions in parallel
        const productIds = [...new Set(movesData.map((m) => m.product_id[0]))];
        const productMap: Record<number, { barcode: string | null; default_code: string | null }> = {};
        const locationPosMap: Record<number, string | null> = {};

        const [prodResult, locResult] = await Promise.all([
          productIds.length > 0
            ? fetch(`/api/odoo/products?ids=${productIds.join(",")}&limit=${productIds.length}`)
            : null,
          fetch("/api/odoo/locations"),
        ]);

        if (prodResult?.ok) {
          const prodData = await prodResult.json();
          for (const p of prodData.products ?? []) {
            productMap[p.id] = {
              barcode: p.barcode || null,
              default_code: p.default_code || null,
            };
          }
        }

        if (locResult.ok) {
          const locData = await locResult.json();
          for (const loc of locData.locations ?? []) {
            const rack = loc.x_physical_rack;
            if (rack) {
              let pos = String(rack);
              if (loc.x_physical_column) pos += `-${String(loc.x_physical_column).padStart(2, "0")}`;
              if (loc.x_physical_level) pos += `-${loc.x_physical_level}`;
              locationPosMap[loc.id] = pos;
            }
          }
        }

        // Enrich moves and optimise route
        const enriched: EnrichedMove[] = movesData.map((m) => ({
          ...m,
          barcode: productMap[m.product_id[0]]?.barcode ?? null,
          default_code: productMap[m.product_id[0]]?.default_code ?? null,
          qty_done: m.quantity ?? 0,
          physicalPos: locationPosMap[m.location_id[0]] ?? null,
        }));

        const sorted = optimizePickingRoute(enriched);

        setPicking(pickingData);
        setMoves(sorted);
        setCurrentIdx(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [pickingId]);

  /* ── keep scanner input focused ── */
  useEffect(() => {
    const refocus = () => {
      if (scanInputRef.current && document.activeElement !== scanInputRef.current) {
        scanInputRef.current.focus();
      }
    };
    const interval = setInterval(refocus, 500);
    refocus();
    return () => clearInterval(interval);
  }, [currentIdx]);

  /* ── flash feedback ── */
  const flashFeedback = useCallback((type: "success" | "error") => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setScanFeedback(type);
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 800);
  }, []);

  /* ── handle scan ── */
  const handleScan = useCallback(
    (scannedCode: string) => {
      const code = scannedCode.trim();
      if (!code || moves.length === 0) return;

      const current = moves[currentIdx];
      if (!current) return;

      const isMatch =
        (current.barcode && code === current.barcode) ||
        (current.default_code && code === current.default_code);

      if (isMatch) {
        // Correct scan → increment qty_done
        feedback.success();
        flashFeedback("success");
        setMoves((prev) =>
          prev.map((m, i) =>
            i === currentIdx ? { ...m, qty_done: m.qty_done + 1 } : m
          )
        );
      } else {
        // Wrong scan → error feedback
        feedback.error();
        flashFeedback("error");
      }
    },
    [currentIdx, moves, flashFeedback]
  );

  /* ── navigate lines ── */
  const goNext = useCallback(() => {
    if (currentIdx < moves.length - 1) {
      setCurrentIdx((i) => i + 1);
      setScanBuffer("");
    }
  }, [currentIdx, moves.length]);

  const goBack = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setScanBuffer("");
    }
  }, [currentIdx]);

  const skip = useCallback(() => {
    goNext();
  }, [goNext]);

  /* ── adjust qty manually ── */
  const adjustQty = useCallback(
    (delta: number) => {
      setMoves((prev) =>
        prev.map((m, i) =>
          i === currentIdx
            ? { ...m, qty_done: Math.max(0, m.qty_done + delta) }
            : m
        )
      );
      if (delta > 0) feedback.success();
    },
    [currentIdx]
  );

  /* ── open warehouse map for current product ── */
  const openMap = useCallback(async () => {
    const current = moves[currentIdx];
    if (!current) return;

    setShowMap(true);
    setMapRack(null);

    // Load locations + quants if not yet loaded
    let locs = locations;
    let quants = allQuants;
    if (locs.length === 0 || quants.length === 0) {
      try {
        const [locRes, stockRes] = await Promise.all([
          fetch("/api/odoo/locations?warehouse_id=1"),
          fetch("/api/odoo/stock"),
        ]);
        const locData = await locRes.json();
        const stockData = await stockRes.json();
        locs = locData.locations ?? [];
        quants = stockData.quants ?? [];
        setLocations(locs);
        setAllQuants(quants);
      } catch (e) {
        console.error("Error loading map data", e);
        return;
      }
    }

    // Filter quants for the current product
    const productId = current.product_id[0];
    try {
      const res = await fetch(`/api/odoo/stock?product_id=${productId}`);
      const data = await res.json();
      const pQuants: OdooQuant[] = data.quants ?? [];
      const locIds = pQuants
        .filter((q) => q.quantity > 0)
        .map((q) => (Array.isArray(q.location_id) ? q.location_id[0] : 0));
      setProductQuants(pQuants);
      setHighlightLocIds(locIds);
    } catch (e) {
      console.error("Error loading product stock for map", e);
    }
  }, [moves, currentIdx, locations, allQuants]);

  const closeMap = useCallback(() => {
    setShowMap(false);
    setMapRack(null);
  }, []);

  const handleMapRackClick = useCallback((rackLabel: string) => {
    const rackId = rackLabel.replace(/[^A-Za-z]/g, "").toUpperCase() || rackLabel;
    setMapRack(rackId);
  }, []);

  /* ── validate picking ── */
  const handleValidate = useCallback(async () => {
    if (!pickingId) return;
    setValidating(true);
    try {
      const moveQuantities: Record<number, number> = {};
      for (const m of moves) {
        moveQuantities[m.id] = m.qty_done;
      }

      const res = await fetch(`/api/odoo/pickings/${pickingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate",
          move_quantities: moveQuantities,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al validar");
      }

      feedback.success();
      router.push("/superinventarios/surtir");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al validar");
      feedback.error();
    } finally {
      setValidating(false);
    }
  }, [pickingId, moves, router]);

  /* ────────── render ────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button
              onClick={() => router.push("/superinventarios/surtir")}
              className="mt-3 text-xs text-red-400 underline"
            >
              Volver a la lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!picking || moves.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-20">
        <p className="text-slate-400">Sin líneas para surtir.</p>
        <button
          onClick={() => router.push("/superinventarios/surtir")}
          className="mt-4 text-sm text-amber-400 underline"
        >
          Volver
        </button>
      </div>
    );
  }

  const current = moves[currentIdx];
  const isLastLine = currentIdx === moves.length - 1;
  const isCurrentComplete = current.qty_done >= current.product_uom_qty;
  const allComplete = moves.every((m) => m.qty_done >= m.product_uom_qty);
  const partner = Array.isArray(picking.partner_id) ? picking.partner_id[1] : null;

  // Feedback overlay color
  const feedbackBorder =
    scanFeedback === "success"
      ? "border-green-500 bg-green-500/5"
      : scanFeedback === "error"
        ? "border-red-500 bg-red-500/5"
        : "border-slate-700/50";

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[calc(100vh-4rem)] pb-4">
      {/* Hidden scanner input */}
      <input
        ref={scanInputRef}
        type="text"
        className="sr-only"
        value={scanBuffer}
        onChange={(e) => setScanBuffer(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && scanBuffer.trim()) {
            handleScan(scanBuffer);
            setScanBuffer("");
          }
        }}
        autoFocus
        aria-label="Escáner de código de barras"
      />

      {/* Top bar */}
      <div className="flex items-center gap-3 py-3 px-1">
        <button
          onClick={() => router.push("/superinventarios/surtir")}
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
              <span className="text-xs text-slate-500 truncate">· {partner}</span>
            )}
          </div>
          {picking.origin && (
            <p className="text-[11px] text-slate-600 truncate">Ref: {picking.origin}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ScanBarcode className="h-4 w-4 text-amber-400" />
          <span className="tabular-nums">
            {currentIdx + 1}/{moves.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden mx-1">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / moves.length) * 100}%` }}
        />
      </div>

      {/* Current move card */}
      <div className={`flex-1 mt-4 mx-1 rounded-2xl border-2 transition-all duration-200 ${feedbackBorder} p-5 flex flex-col`}>
        {/* Location chip */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold px-3 py-2 rounded-lg min-h-[40px]">
            <MapPin className="h-4 w-4" />
            <span>{current.location_id[1]}</span>
          </div>
          {current.physicalPos && (
            <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold px-3 py-2 rounded-lg min-h-[40px]">
              <span>Pos: {current.physicalPos}</span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-lg font-bold text-slate-100 leading-snug">
            {current.product_id[1]}
          </p>
          {(current.default_code || current.barcode) && (
            <p className="text-xs text-slate-500 font-mono mt-1">
              {current.default_code || current.barcode}
            </p>
          )}

          {/* Quantity display */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              onClick={() => adjustQty(-1)}
              disabled={current.qty_done <= 0}
              className="w-14 h-14 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center transition-colors active:scale-95"
            >
              <Minus className="h-6 w-6 text-slate-300" />
            </button>

            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className={`text-5xl font-black tabular-nums transition-colors ${
                    isCurrentComplete ? "text-green-400" : "text-slate-100"
                  }`}
                >
                  {current.qty_done}
                </span>
                <span className="text-2xl text-slate-600 font-bold">/</span>
                <span className="text-2xl text-slate-500 font-bold tabular-nums">
                  {current.product_uom_qty}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 uppercase tracking-widest">
                Unidades
              </p>
            </div>

            <button
              onClick={() => adjustQty(1)}
              className="w-14 h-14 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95"
            >
              <Plus className="h-6 w-6 text-slate-300" />
            </button>
          </div>

          {/* Scan hint */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
            <ScanBarcode className="h-3.5 w-3.5" />
            <span>Escanea el código del producto</span>
          </div>

          {/* Where is it? button */}
          <button
            onClick={openMap}
            className="mt-3 mx-auto flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 px-4 py-2.5 rounded-lg transition-colors min-h-[40px]"
          >
            <Map className="h-3.5 w-3.5" />
            ¿Dónde está en el almacén?
          </button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-3 mt-4 px-1">
        {currentIdx > 0 && (
          <button
            onClick={goBack}
            className="px-4 py-3 rounded-xl text-sm font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors min-h-[48px] active:scale-[0.97]"
          >
            Anterior
          </button>
        )}

        <button
          onClick={skip}
          disabled={isLastLine}
          className="px-4 py-3 rounded-xl text-sm font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors min-h-[48px] flex items-center gap-2 active:scale-[0.97]"
        >
          <SkipForward className="h-4 w-4" />
          Saltar
        </button>

        <div className="flex-1" />

        {!isLastLine && (
          <button
            onClick={goNext}
            className="px-5 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors min-h-[48px] flex items-center gap-2 active:scale-[0.97]"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {isLastLine && (
          <button
            onClick={handleValidate}
            disabled={validating}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors min-h-[48px] flex items-center gap-2 active:scale-[0.97] ${
              allComplete
                ? "bg-green-500 hover:bg-green-400 text-slate-900"
                : "bg-amber-500 hover:bg-amber-400 text-slate-900"
            }`}
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {validating ? "Validando…" : "Validar pedido"}
          </button>
        )}
      </div>

      {/* Line summary strip */}
      <div className="flex gap-1 mt-3 px-1 overflow-x-auto">
        {moves.map((m, i) => {
          const done = m.qty_done >= m.product_uom_qty;
          const isCurrent = i === currentIdx;
          return (
            <button
              key={m.id}
              onClick={() => {
                setCurrentIdx(i);
                setScanBuffer("");
              }}
              className={`h-2 flex-1 min-w-[12px] rounded-full transition-all ${
                done
                  ? "bg-green-500"
                  : isCurrent
                    ? "bg-amber-500"
                    : m.qty_done > 0
                      ? "bg-amber-500/40"
                      : "bg-slate-700"
              }`}
              aria-label={`Línea ${i + 1}: ${m.product_id[1]}`}
            />
          );
        })}
      </div>

      {/* ── Map overlay ── */}
      {showMap && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col">
          {/* Map header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/95 shrink-0">
            <button
              onClick={mapRack ? () => setMapRack(null) : closeMap}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100">
                {mapRack ? `Rack ${mapRack}` : "Mapa del Almacén"}
              </p>
              <p className="text-[11px] text-amber-400 truncate">
                {current.product_id[1]}
              </p>
            </div>
            <button
              onClick={closeMap}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* Map content */}
          <div className="flex-1 overflow-auto p-4">
            {!mapRack ? (
              <WarehouseLayout
                locations={locations}
                quants={allQuants}
                highlightedLocations={highlightLocIds}
                highlightQuants={productQuants}
                onRackClick={handleMapRackClick}
              />
            ) : (
              <RackFrontalView
                rackId={mapRack}
                locations={locations}
                quants={allQuants}
                highlightedLocations={highlightLocIds}
                highlightQuants={productQuants}
                onBack={() => setMapRack(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
