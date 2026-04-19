"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, Save, AlertCircle, MapPin } from "lucide-react";
import { MovementLines, type MoveLine } from "@/components/inventory/MovementLines";

interface Location {
  id: number;
  complete_name: string;
  name: string;
}

const WAREHOUSES = [
  { id: 1, label: "CEDIS", picking_type_id: 7 },
  { id: 2, label: "SUCURSAL", picking_type_id: 15 },
  { id: 3, label: "CONTENEDOR", picking_type_id: 23 },
];

function NuevoTrasladoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLocationId = searchParams.get("from");

  const [warehouseId, setWarehouseId] = useState(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  // Origen is set only via stock chip selection (or from URL param)
  const [locationOriginId, setLocationOriginId] = useState(fromLocationId ?? "");
  const [locationOriginName, setLocationOriginName] = useState("");
  const [locationDestId, setLocationDestId] = useState("");
  const [lines, setLines] = useState<MoveLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load all locations
  useEffect(() => {
    async function loadLocations() {
      setLocationsLoading(true);
      try {
        const res = await fetch("/api/odoo/locations");
        const data = await res.json();
        const locs: Location[] = data.locations ?? [];
        setLocations(locs);
        // If fromLocationId, set name
        if (fromLocationId) {
          const found = locs.find((l) => String(l.id) === fromLocationId);
          if (found) setLocationOriginName(found.complete_name);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLocationsLoading(false);
      }
    }
    loadLocations();
  }, [fromLocationId]);

  const selectedWarehouse = WAREHOUSES.find((w) => w.id === warehouseId)!;

  function handleOriginFromStock(locId: number) {
    setLocationOriginId(String(locId));
    const found = locations.find((l) => l.id === locId);
    setLocationOriginName(found?.complete_name ?? found?.name ?? `ID ${locId}`);
  }

  async function handleSubmit(autoValidate: boolean) {
    if (!locationOriginId) {
      setError("Selecciona un producto y elige la ubicación de origen desde el desglose de stock.");
      return;
    }
    if (!locationDestId) {
      setError("Selecciona la ubicación de destino.");
      return;
    }
    if (lines.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }
    const invalidLine = lines.find((l) => !l.product_id || l.qty_demanded <= 0);
    if (invalidLine) {
      setError("Todos los productos requieren nombre y cantidad válida.");
      return;
    }

    // Always validate stock at origin before submitting
    const originId = parseInt(locationOriginId);
    for (const line of lines) {
      if (!line.stockByLocation) {
        setError(`Espera a que se cargue el stock de "${line.product_name}".`);
        return;
      }
      const atOrigin = line.stockByLocation.find(
        (s) => s.locationId === originId
      );
      const available = atOrigin ? atOrigin.quantity - atOrigin.reserved : 0;
      if (available < line.qty_demanded) {
        setError(
          `"${line.product_name}" solo tiene ${Math.max(0, available)} uds disponibles en el origen. ` +
          `Necesitas ${line.qty_demanded}.`
        );
        return;
      }
    }

    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/odoo/pickings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picking_type_id: selectedWarehouse.picking_type_id,
          location_id: originId,
          location_dest_id: parseInt(locationDestId),
          move_lines: lines.map((l) => ({
            product_id: l.product_id,
            product_qty: l.qty_demanded,
            product_name: l.product_name,
            location_id: originId,
            location_dest_id: parseInt(locationDestId),
          })),
          auto_confirm: autoValidate,
          auto_validate: autoValidate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al crear traslado");
        return;
      }

      setSuccess(
        autoValidate
          ? `Traslado validado (ID: ${data.pickingId})`
          : `Borrador guardado (ID: ${data.pickingId})`
      );
      setTimeout(() => router.push("/superinventarios/traslados"), 2000);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-100 text-sm transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ← Volver
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Nuevo Traslado</h2>
          <p className="text-slate-500 text-xs">
            Movimiento interno entre ubicaciones
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-sm text-green-300">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Origin display (read-only, set by stock chips) */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-400" />
          Origen y destino
        </h3>

        {/* Origen — set by product stock selection */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-500 block">Ubicación de origen</label>
          {locationOriginId ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 min-h-[48px]">
              <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-amber-200 truncate">
                {locationOriginName || `Ubicación #${locationOriginId}`}
              </span>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-lg px-4 py-3 min-h-[48px] flex items-center">
              <span className="text-xs text-slate-500">
                Se define al seleccionar un producto y tocar su ubicación con stock
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center py-1">
          <ArrowRight className="h-4 w-4 text-slate-600" />
        </div>

        {/* Destino */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-500 block">Almacén destino</label>
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(parseInt(e.target.value));
              setLocationDestId("");
            }}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[48px]"
          >
            {WAREHOUSES.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-500 block">Ubicación de destino</label>
          <select
            value={locationDestId}
            onChange={(e) => setLocationDestId(e.target.value)}
            disabled={locationsLoading}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 min-h-[48px]"
          >
            <option value="">Seleccionar destino...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.complete_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 px-1">
          Productos a trasladar
        </h3>
        <MovementLines
          lines={lines}
          onChange={setLines}
          showDone={false}
          locationId={locationOriginId ? parseInt(locationOriginId) : undefined}
          onSuggestOrigin={handleOriginFromStock}
          requireOriginFromStock
        />
      </div>

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
          Confirmar y Validar
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
    </div>
  );
}

export default function NuevoTrasladoPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm p-6">Cargando...</div>}>
      <NuevoTrasladoContent />
    </Suspense>
  );
}
