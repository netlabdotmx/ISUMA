"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Flag,
  MapPin,
  Minus,
  Plus,
  ScanBarcode,
  AlertTriangle,
  Loader2,
  Package,
} from "lucide-react";
import * as feedback from "@/lib/feedback";

/* ────────── types ────────── */

interface QuantLine {
  product_id: number;
  product_name: string;
  product_code: string | null;
  barcode: string | null;
  expected_qty: number;
  counted_qty: number;
}

interface LocationInfo {
  id: number;
  name: string;
  complete_name: string;
}

/* ────────── component ────────── */

export default function ContarLocationPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const router = useRouter();

  const [locationId, setLocationId] = useState<number | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [lines, setLines] = useState<QuantLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanBuffer, setScanBuffer] = useState("");
  const [scanFeedback, setScanFeedback] = useState<"success" | "error" | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then(({ locationId: id }) => setLocationId(parseInt(id)));
  }, [params]);

  /* ── load location + quants + product barcodes ── */
  useEffect(() => {
    if (locationId === null) return;

    async function load() {
      setLoading(true);
      try {
        // Fetch location info
        const locRes = await fetch(`/api/odoo/locations`);
        if (!locRes.ok) throw new Error("Error cargando ubicaciones");
        const locData = await locRes.json();
        const loc = (locData.locations as LocationInfo[]).find(
          (l) => l.id === locationId
        );
        if (!loc) throw new Error("Ubicación no encontrada");
        setLocation(loc);

        // Fetch quants for this location
        const quantRes = await fetch(
          `/api/odoo/stock?location_id=${locationId}`
        );
        if (!quantRes.ok) throw new Error("Error cargando stock");
        const quantData = await quantRes.json();
        const quants = quantData.quants as {
          product_id: [number, string];
          quantity: number;
        }[];

        if (quants.length === 0) {
          setLines([]);
          setLoading(false);
          return;
        }

        // Fetch product barcodes
        const productIds = [...new Set(quants.map((q) => q.product_id[0]))];
        const prodRes = await fetch(
          `/api/odoo/products?ids=${productIds.join(",")}&limit=${productIds.length}`
        );
        const prodData = prodRes.ok ? await prodRes.json() : { products: [] };
        const productMap = new Map<
          number,
          { barcode: string | null; default_code: string | null }
        >();
        for (const p of prodData.products ?? []) {
          productMap.set(p.id, {
            barcode: p.barcode || null,
            default_code: p.default_code || null,
          });
        }

        // Build lines
        const result: QuantLine[] = quants.map((q) => ({
          product_id: q.product_id[0],
          product_name: q.product_id[1],
          product_code: productMap.get(q.product_id[0])?.default_code ?? null,
          barcode: productMap.get(q.product_id[0])?.barcode ?? null,
          expected_qty: q.quantity,
          counted_qty: 0,
        }));

        // Sort by product name
        result.sort((a, b) => a.product_name.localeCompare(b.product_name));

        setLines(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [locationId]);

  /* ── keep scanner focused ── */
  useEffect(() => {
    const refocus = () => {
      if (scanInputRef.current && document.activeElement?.tagName !== "INPUT") {
        scanInputRef.current.focus();
      }
    };
    const interval = setInterval(refocus, 800);
    refocus();
    return () => clearInterval(interval);
  }, []);

  /* ── flash feedback ── */
  const flashFeedback = useCallback((type: "success" | "error") => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setScanFeedback(type);
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 600);
  }, []);

  /* ── handle scan ── */
  const handleScan = useCallback(
    (scannedCode: string) => {
      const code = scannedCode.trim();
      if (!code) return;

      const idx = lines.findIndex(
        (l) =>
          (l.barcode && code === l.barcode) ||
          (l.product_code && code === l.product_code)
      );

      if (idx >= 0) {
        feedback.success();
        flashFeedback("success");
        setLines((prev) =>
          prev.map((l, i) =>
            i === idx ? { ...l, counted_qty: l.counted_qty + 1 } : l
          )
        );
      } else {
        feedback.error();
        flashFeedback("error");
      }
    },
    [lines, flashFeedback]
  );

  /* ── adjust qty manually ── */
  const adjustQty = useCallback((productId: number, delta: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.product_id === productId
          ? { ...l, counted_qty: Math.max(0, l.counted_qty + delta) }
          : l
      )
    );
  }, []);

  const setQty = useCallback((productId: number, value: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.product_id === productId
          ? { ...l, counted_qty: Math.max(0, value) }
          : l
      )
    );
  }, []);

  /* ── submit: confirm adjustments ── */
  const handleConfirm = useCallback(async () => {
    if (!locationId) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Only send lines that have differences
      const diffs = lines.filter((l) => l.counted_qty !== l.expected_qty);

      if (diffs.length === 0) {
        setSuccess("No hay diferencias. Todo coincide.");
        feedback.success();
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/odoo/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          adjustments: diffs.map((d) => ({
            productId: d.product_id,
            countedQty: d.counted_qty,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al aplicar ajustes");
      }

      feedback.success();
      setSuccess(`${diffs.length} ajuste${diffs.length !== 1 ? "s" : ""} aplicado${diffs.length !== 1 ? "s" : ""} correctamente.`);

      // Redirect after brief delay
      setTimeout(() => router.push("/superinventarios/contar"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aplicar ajustes");
      feedback.error();
    } finally {
      setSubmitting(false);
    }
  }, [locationId, lines, router]);

  /* ── submit: mark for review (don't adjust, just go back) ── */
  const handleMarkForReview = useCallback(() => {
    feedback.warning();
    // In a full implementation this would create a note/task in Odoo
    // For now, go back without adjusting
    router.push("/superinventarios/contar");
  }, [router]);

  /* ────────── render ────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const diffCount = lines.filter((l) => l.counted_qty !== l.expected_qty && l.counted_qty > 0).length;
  const countedCount = lines.filter((l) => l.counted_qty > 0).length;

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-4rem)] pb-4">
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
          onClick={() => router.push("/superinventarios/contar")}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="font-mono font-bold text-slate-100 text-sm truncate">
              {location?.name}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 truncate pl-6">
            {location?.complete_name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ScanBarcode className="h-4 w-4 text-cyan-400" />
          <span className="tabular-nums">
            {countedCount}/{lines.length}
          </span>
        </div>
      </div>

      {/* Scan feedback border */}
      <div
        className={`h-0.5 rounded-full transition-all duration-300 mx-1 ${
          scanFeedback === "success"
            ? "bg-green-500"
            : scanFeedback === "error"
              ? "bg-red-500"
              : "bg-slate-800"
        }`}
      />

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 mx-1 mt-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 bg-green-900/30 border border-green-700/50 rounded-xl p-3 text-sm text-green-300 mx-1 mt-3">
          <Check className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Lines */}
      <div className="flex-1 mt-3 space-y-2 px-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-8 w-8 text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">Sin stock en esta ubicación.</p>
          </div>
        ) : (
          lines.map((line) => {
            const hasDiff =
              line.counted_qty > 0 && line.counted_qty !== line.expected_qty;
            const diff = line.counted_qty - line.expected_qty;

            return (
              <div
                key={line.product_id}
                className={`rounded-xl border-2 p-3 transition-all ${
                  hasDiff
                    ? "bg-red-900/10 border-red-700/50"
                    : line.counted_qty > 0
                      ? "bg-green-900/10 border-green-700/30"
                      : "bg-slate-800/40 border-slate-700/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Product info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100 leading-snug">
                      {line.product_name}
                    </p>
                    {line.product_code && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {line.product_code}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Esperado:{" "}
                      <span className="font-bold text-slate-300 tabular-nums">
                        {line.expected_qty}
                      </span>
                    </p>
                  </div>

                  {/* Counted qty controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => adjustQty(line.product_id, -1)}
                      disabled={line.counted_qty <= 0}
                      className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Minus className="h-4 w-4 text-slate-300" />
                    </button>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.counted_qty || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setQty(line.product_id, val);
                      }}
                      className={`w-16 h-10 rounded-lg text-center font-bold tabular-nums text-lg border-2 bg-transparent transition-colors ${
                        hasDiff
                          ? "border-red-500 text-red-300"
                          : line.counted_qty > 0
                            ? "border-green-500/50 text-green-300"
                            : "border-slate-600 text-slate-400"
                      }`}
                      placeholder="0"
                    />

                    <button
                      onClick={() => adjustQty(line.product_id, 1)}
                      className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Plus className="h-4 w-4 text-slate-300" />
                    </button>
                  </div>
                </div>

                {/* Diff indicator */}
                {hasDiff && (
                  <div className="mt-2 text-xs font-bold text-red-400">
                    Diferencia: {diff > 0 ? `+${diff}` : diff}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Scan hint */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-600 mt-3 px-1">
        <ScanBarcode className="h-3.5 w-3.5" />
        <span>Escanea productos para contar (+1 por escaneo)</span>
      </div>

      {/* Bottom actions */}
      {lines.length > 0 && (
        <div className="flex items-center gap-3 mt-3 px-1">
          <button
            onClick={handleMarkForReview}
            className="px-4 py-3 rounded-xl text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors min-h-[48px] flex items-center gap-2 active:scale-[0.97]"
          >
            <Flag className="h-4 w-4" />
            Revisión
          </button>

          <div className="flex-1" />

          <button
            onClick={handleConfirm}
            disabled={submitting || countedCount === 0}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors min-h-[48px] flex items-center gap-2 active:scale-[0.97] ${
              diffCount > 0
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-green-500 hover:bg-green-400 text-slate-900"
            } disabled:opacity-40`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {submitting
              ? "Aplicando…"
              : diffCount > 0
                ? `Confirmar ${diffCount} diferencia${diffCount !== 1 ? "s" : ""}`
                : "Confirmar conteo"}
          </button>
        </div>
      )}
    </div>
  );
}
