import { odooCall } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";
import { PickingStatusBadge } from "@/components/inventory/PickingStatusBadge";
import { ArrowRightLeft, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { PickingActions } from "./PickingActions";

export const dynamic = "force-dynamic";

interface Move {
  id: number;
  product_id: [number, string];
  product_uom_qty: number;
  quantity: number;
  state: string;
}

interface Picking {
  id: number;
  name: string;
  state: string;
  picking_type_id: [number, string];
  location_id: [number, string];
  location_dest_id: [number, string];
  origin: string | false;
  scheduled_date: string | false;
  date_done: string | false;
  create_date: string;
  move_ids: number[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Traslado #${id}` };
}

async function getPickingDetail(id: string) {
  const sid = await getSessionId();
  const [pickings, moves] = await Promise.all([
    odooCall<Picking[]>(
      sid,
      "stock.picking",
      "search_read",
      [[["id", "=", parseInt(id)]]],
      {
        fields: [
          "id", "name", "state", "picking_type_id",
          "location_id", "location_dest_id",
          "origin", "scheduled_date", "date_done", "create_date",
          "move_ids",
        ],
      }
    ),
    odooCall<Move[]>(
      sid,
      "stock.move",
      "search_read",
      [[["picking_id", "=", parseInt(id)]]],
      {
        fields: ["id", "product_id", "product_uom_qty", "quantity", "state"],
      }
    ),
  ]);
  return { picking: pickings[0] ?? null, moves };
}

function formatDate(s: string | false) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PickingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let picking: Picking | null = null;
  let moves: Move[] = [];
  let error = "";

  try {
    const result = await getPickingDetail(id);
    picking = result.picking;
    moves = result.moves;
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (!picking && !error) {
    return (
      <div className="text-center py-20 text-slate-500">
        Albarán no encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link
          href="/superinventarios/traslados"
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Traslados
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300 font-mono text-sm">
          {picking?.name ?? `#${id}`}
        </span>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {picking && (
        <>
          {/* Header info */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-100 font-mono">
                    {picking.name}
                  </h2>
                  <PickingStatusBadge state={picking.state} />
                </div>
                <p className="text-sm text-slate-400">
                  {Array.isArray(picking.picking_type_id)
                    ? picking.picking_type_id[1]
                    : "Traslado"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="truncate max-w-[130px]">
                  {Array.isArray(picking.location_id) ? picking.location_id[1] : "—"}
                </span>
                <ArrowRightLeft className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate max-w-[130px]">
                  {Array.isArray(picking.location_dest_id)
                    ? picking.location_dest_id[1]
                    : "—"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Referencia</p>
                <p className="text-slate-200">{picking.origin || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Creado</p>
                <p className="text-slate-200">{formatDate(picking.create_date)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Programado</p>
                <p className="text-slate-200">{formatDate(picking.scheduled_date)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Completado</p>
                <p className="text-slate-200">{formatDate(picking.date_done)}</p>
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-slate-100">Líneas de movimiento</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/40">
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">
                    Producto
                  </th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">
                    Demandado
                  </th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">
                    Hecho
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {moves.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                      Sin líneas de movimiento
                    </td>
                  </tr>
                )}
                {moves.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-slate-100">
                      {Array.isArray(m.product_id) ? m.product_id[1] : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-300">
                      {m.product_uom_qty}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span
                        className={
                          m.quantity >= m.product_uom_qty
                            ? "text-green-400"
                            : "text-amber-400"
                        }
                      >
                        {m.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <PickingActions
            pickingId={picking.id}
            state={picking.state}
            moves={moves}
          />
        </>
      )}
    </div>
  );
}
