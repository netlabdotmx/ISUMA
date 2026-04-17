"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, Plus, Camera, Save, CheckCircle } from "lucide-react";
import { MovementLines, type MoveLine } from "@/components/inventory/MovementLines";

const PICKING_TYPES = [
  { id: 17, label: "Recepción de Contenedor", locationId: 8, locationDestId: 25 },
  { id: 1, label: "Recepción CEDIS", locationId: 8, locationDestId: 5 },
  { id: 9, label: "Recepción SUCURSAL", locationId: 8, locationDestId: 19 },
];

// Vendor location in Odoo is typically id=8 (Partners/Vendors)
// Adjust if your Odoo instance uses a different ID

export default function RecepcionPage() {
  const router = useRouter();
  const [pickingTypeId, setPickingTypeId] = useState(17);
  const [origin, setOrigin] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lines, setLines] = useState<MoveLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedType = PICKING_TYPES.find((t) => t.id === pickingTypeId)!;

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
          scheduled_date: scheduledDate,
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
          ? `Recepción validada correctamente (ID: ${data.pickingId})`
          : `Recepción guardada como borrador (ID: ${data.pickingId})`
      );

      // Redirect after 2 seconds
      setTimeout(() => router.push("/superinventarios/recepcion"), 2000);
    } catch (e) {
      setError("Error de conexión. Intenta de nuevo.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Recepción de Mercancía</h2>
        <p className="text-slate-400 text-sm mt-1">
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
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-5">
        {/* Step 1: Tipo y referencia */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
            Tipo de recepción
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs text-slate-400 mb-1.5 block">
                Tipo de operación
              </label>
              <select
                value={pickingTypeId}
                onChange={(e) => setPickingTypeId(parseInt(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {PICKING_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-slate-400 mb-1.5 block">
                Referencia / Contenedor
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Ej. CONT-ABR-2026-001"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-slate-400 mb-1.5 block">
                Fecha de recepción
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700" />

        {/* Step 2: Productos */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
            Productos a recibir
            <button
              type="button"
              title="Escáner de código de barras (próximamente)"
              className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-lg transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              Escáner
              <span className="text-slate-600">(próx.)</span>
            </button>
          </h3>
          <MovementLines
            lines={lines}
            onChange={setLines}
            showDone={true}
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
          Confirmar Recepción
        </button>
      </div>

      {/* Recent receptions list */}
      <RecentReceptions />
    </div>
  );
}

function RecentReceptions() {
  const [pickings, setPickings] = useState<
    { id: number; name: string; state: string; origin: string | false; create_date: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch("/api/odoo/pickings?code=incoming&limit=5")
      .then((r) => r.json())
      .then((d) => setPickings(d.pickings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  });

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
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
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
          <div key={p.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-mono text-slate-100">{p.name}</p>
              <p className="text-xs text-slate-500">{p.origin || "Sin referencia"}</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
              {STATE_LABELS[p.state] ?? p.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
