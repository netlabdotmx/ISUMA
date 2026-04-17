"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, CheckCircle, Save, AlertCircle } from "lucide-react";
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

  const [warehouseOriginId, setWarehouseOriginId] = useState(1);
  const [warehouseDestId, setWarehouseDestId] = useState(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationOriginId, setLocationOriginId] = useState(fromLocationId ?? "");
  const [locationDestId, setLocationDestId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
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
        setLocations(data.locations ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLocationsLoading(false);
      }
    }
    loadLocations();
  }, []);

  const selectedWarehouseOrigin = WAREHOUSES.find((w) => w.id === warehouseOriginId)!;
  const isFromContainer = locationOriginId === "25";

  async function handleSubmit(autoValidate: boolean) {
    if (!locationOriginId || !locationDestId) {
      setError("Selecciona origen y destino");
      return;
    }
    if (lines.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }
    const invalidLine = lines.find((l) => !l.product_id || l.qty_demanded <= 0);
    if (invalidLine) {
      setError("Todos los productos requieren nombre y cantidad válida");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/odoo/pickings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picking_type_id: selectedWarehouseOrigin.picking_type_id,
          location_id: parseInt(locationOriginId),
          location_dest_id: parseInt(locationDestId),
          scheduled_date: scheduledDate,
          move_lines: lines.map((l) => ({
            product_id: l.product_id,
            product_qty: l.qty_demanded,
            product_name: l.product_name,
            location_id: parseInt(locationOriginId),
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
          : `Traslado guardado como borrador (ID: ${data.pickingId})`
      );
      setTimeout(() => router.push("/superinventarios/traslados"), 2000);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-100 text-sm transition-colors"
        >
          ← Volver
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Nuevo Traslado</h2>
          <p className="text-slate-400 text-sm mt-1">
            Movimiento interno entre ubicaciones
          </p>
        </div>
      </div>

      {/* Container banner */}
      {isFromContainer && (
        <div className="flex items-center gap-3 bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 text-sm text-blue-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          Traslado desde{" "}
          <strong>Contenedor a ubicación final</strong>. El stock se moverá al
          CEDIS.
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-sm text-green-300">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-5">
        {/* Origen / Destino */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
            Origen y destino
          </h3>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* ORIGEN */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Almacén de origen
                </label>
                <select
                  value={warehouseOriginId}
                  onChange={(e) => {
                    setWarehouseOriginId(parseInt(e.target.value));
                    setLocationOriginId("");
                  }}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Ubicación de origen
                </label>
                <select
                  value={locationOriginId}
                  onChange={(e) => setLocationOriginId(e.target.value)}
                  disabled={locationsLoading}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                >
                  <option value="">Seleccionar...</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.complete_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden sm:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <ArrowRightLeft className="h-5 w-5 text-slate-600" />
            </div>

            {/* DESTINO */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Almacén de destino
                </label>
                <select
                  value={warehouseDestId}
                  onChange={(e) => {
                    setWarehouseDestId(parseInt(e.target.value));
                    setLocationDestId("");
                  }}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Ubicación de destino
                </label>
                <select
                  value={locationDestId}
                  onChange={(e) => setLocationDestId(e.target.value)}
                  disabled={locationsLoading}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                >
                  <option value="">Seleccionar...</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.complete_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-slate-400 mb-1.5 block">
              Fecha programada
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        <div className="border-t border-slate-700" />

        {/* Productos */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
            Productos a trasladar
          </h3>
          <MovementLines
            lines={lines}
            onChange={setLines}
            showDone={false}
            locationId={locationOriginId ? parseInt(locationOriginId) : undefined}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(false)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Guardar borrador
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Confirmar y Validar
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
