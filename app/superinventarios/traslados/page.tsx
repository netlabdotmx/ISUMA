import { odooCall } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";
import { PickingStatusBadge } from "@/components/inventory/PickingStatusBadge";
import { ArrowRightLeft, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Traslados" };
export const dynamic = "force-dynamic";

interface Picking {
  id: number;
  name: string;
  state: string;
  picking_type_id: [number, string];
  location_id: [number, string];
  location_dest_id: [number, string];
  origin: string | false;
  scheduled_date: string | false;
  create_date: string;
}

async function getTransfers(): Promise<Picking[]> {
  const sid = await getSessionId();
  return odooCall<Picking[]>(
    sid,
    "stock.picking",
    "search_read",
    [[["picking_type_id.code", "=", "internal"], ["state", "!=", "cancel"]]],
    {
      fields: [
        "id", "name", "state", "picking_type_id",
        "location_id", "location_dest_id",
        "origin", "scheduled_date", "create_date",
      ],
      limit: 50,
      order: "create_date desc",
    }
  );
}

function formatDate(s: string | false) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function TrasladosPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  let pickings: Picking[] = [];
  let error = "";

  try {
    pickings = await getTransfers();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error de conexión";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Traslados</h2>
          <p className="text-slate-400 text-sm mt-1">
            Movimientos internos entre ubicaciones
          </p>
        </div>
        <Link
          href={from
            ? `/superinventarios/traslados/nuevo?from=${encodeURIComponent(from)}`
            : "/superinventarios/traslados/nuevo"}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo traslado
        </Link>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">
                  Nombre
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">
                  Origen → Destino
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium hidden sm:table-cell">
                  Referencia
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium hidden lg:table-cell">
                  Fecha
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">
                  Estado
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pickings.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    No hay traslados registrados
                  </td>
                </tr>
              )}
              {pickings.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-slate-100">{p.name}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <span className="truncate max-w-[120px]">
                        {Array.isArray(p.location_id)
                          ? p.location_id[1]
                          : "—"}
                      </span>
                      <ArrowRightLeft className="h-3 w-3 shrink-0 text-slate-600" />
                      <span className="truncate max-w-[120px]">
                        {Array.isArray(p.location_dest_id)
                          ? p.location_dest_id[1]
                          : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                    {p.origin || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                    {formatDate(p.scheduled_date || p.create_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <PickingStatusBadge state={p.state} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/superinventarios/traslados/${p.id}`}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
