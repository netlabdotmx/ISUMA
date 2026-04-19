"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle, AlertTriangle, PackageSearch, ChevronRight } from "lucide-react";
import Link from "next/link";
import { MovementLines, type MoveLine } from "@/components/inventory/MovementLines";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";

const PICKING_TYPES = [
  { id: 17, label: "Recepción de Contenedor", locationId: 8, locationDestId: 25 },
  { id: 1, label: "Recepción CEDIS", locationId: 8, locationDestId: 5 },
  { id: 9, label: "Recepción SUCURSAL", locationId: 8, locationDestId: 19 },
];

export default function RecepcionPage() {
  const router = useRouter();
  const [pickingTypeId, setPickingTypeId] = useState(17);
  const [origin, setOrigin] = useState("");
  const [lines, setLines] = useState<MoveLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [unknownBarcodes, setUnknownBarcodes] = useState<string[]>([]);

  const selectedType = PICKING_TYPES.find((t) => t.id === pickingTypeId)!;

  async function handleBarcodeScan(barcode: string) {
    setScanLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/odoo/products?barcode=${encodeURIComponent(barcode)}&limit=1`
      );
      const data = await res.json();
      const products = data.products ?? [];
      if (products.length === 0) {
        setError(`No se encontró producto con código "${barcode}". Usa "Reportar producto nuevo" abajo.`);
        if (!unknownBarcodes.includes(barcode)) {
          setUnknownBarcodes((prev) => [...prev, barcode]);
        }
        return;
      }
      const p = products[0];
      const existing = lines.find((l) => l.product_id === p.id);
      if (existing) {
        setLines(
          lines.map((l) =>
            l.id === existing.id
              ? { ...l, qty_demanded: l.qty_demanded + 1, qty_done: l.qty_done + 1 }
              : l
          )
        );
      } else {
        const newLine: MoveLine = {
          id: `scan-${Date.now()}`,
          product_id: p.id,
          product_name: p.name,
          product_code: p.default_code || p.barcode || "",
          qty_demanded: 1,
          qty_done: 1,
          qty_available: p.qty_available,
        };
        setLines([...lines, newLine]);
      }
    } catch {
      setError("Error de conexión al buscar producto");
    } finally {
      setScanLoading(false);
    }
  }

  async function handleSubmit(autoValidate: boolean) {
    if (lines.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }
    const invalidLine = lines.find((l) => !l.product_id || l.qty_demanded <= 0);
    if (invalidLine) {
      setError("Todos los productos deben tener nombre y cantidad válida");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/odoo/pickings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picking_type_id: selectedType.id,
          origin: origin.trim() || undefined,
          location_id: selectedType.locationId,
          location_dest_id: selectedType.locationDestId,
          move_lines: lines.map((l) => ({
            product_id: l.product_id,
            product_qty: l.qty_demanded,
            product_name: l.product_name,
            location_id: selectedType.locationId,
            location_dest_id: selectedType.locationDestId,
          })),
          auto_confirm: autoValidate,
          auto_validate: autoValidate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al crear recepción");
        return;
      }

      setSuccess(
        autoValidate
          ? `Recepción validada (ID: ${data.pickingId})`
          : `Borrador guardado (ID: ${data.pickingId})`
      );
      setTimeout(() => router.push("/superinventarios/recepcion"), 2000);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Recibir Mercancía</h2>
        <p className="text-slate-500 text-xs mt-1">
          Registra la entrada de productos al almacén
        </p>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-sm text-green-300">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Type + Reference — compact top row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] text-slate-500 mb-1 block">Tipo</label>
          <select
            value={pickingTypeId}
            onChange={(e) => setPickingTypeId(parseInt(e.target.value))}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[48px]"
          >
            {PICKING_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-slate-500 mb-1 block">Referencia</label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="CONT-001..."
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[48px]"
          />
        </div>
      </div>

      {/* Scanner */}
      <BarcodeScanner onScan={handleBarcodeScan} scanning={scanLoading} />

      {/* Lines */}
      <MovementLines
        lines={lines}
        onChange={setLines}
        showDone={true}
      />

      {/* Unknown barcodes report */}
      {unknownBarcodes.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Productos no encontrados ({unknownBarcodes.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unknownBarcodes.map((code) => (
              <span
                key={code}
                className="text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-200 px-2.5 py-1.5 rounded-lg"
              >
                {code}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-amber-400/70">
            Estos códigos se reportarán al supervisor para dar de alta en Odoo.
          </p>
        </div>
      )}

      {/* Actions — large tappable buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(true)}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 font-bold text-sm px-5 py-4 rounded-xl transition-colors disabled:opacity-50 min-h-[52px] active:scale-[0.98]"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          Confirmar Recepción
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(false)}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-semibold text-sm px-5 py-3 rounded-xl transition-colors disabled:opacity-50 min-h-[48px] active:scale-[0.98]"
        >
          <Save className="h-4 w-4" />
          Guardar borrador
        </button>
      </div>

      {/* Recent receptions */}
      <RecentReceptions />
    </div>
  );
}

function RecentReceptions() {
  const [pickings, setPickings] = useState<
    { id: number; name: string; state: string; origin: string | false; create_date: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/odoo/pickings?code=incoming&limit=5")
      .then((r) => r.json())
      .then((d) => setPickings(d.pickings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const STATE_LABELS: Record<string, string> = {
    draft: "Borrador",
    confirmed: "Confirmado",
    assigned: "Listo",
    done: "Hecho",
    cancel: "Cancelado",
    waiting: "En espera",
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl">
      <div className="px-5 py-4 border-b border-slate-700">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
          <PackageSearch className="h-4 w-4 text-amber-400" />
          Recepciones recientes
        </h3>
      </div>
      <div className="divide-y divide-slate-800">
        {loading && (
          <div className="px-5 py-4 text-sm text-slate-500">Cargando...</div>
        )}
        {!loading && pickings.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            No hay recepciones registradas
          </div>
        )}
        {pickings.map((p) => (
          <Link
            key={p.id}
            href={`/superinventarios/traslados/${p.id}`}
            className="flex items-center justify-between px-5 py-3 min-h-[48px] hover:bg-slate-700/30 transition-colors"
          >
            <div>
              <p className="text-sm font-mono text-slate-100">{p.name}</p>
              <p className="text-xs text-slate-500">{p.origin || "Sin referencia"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                {STATE_LABELS[p.state] ?? p.state}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
