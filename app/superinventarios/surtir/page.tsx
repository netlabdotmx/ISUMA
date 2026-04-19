import type { Metadata } from "next";
import Link from "next/link";
import { odooCall, type OdooPicking } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";
import { ClipboardList, User, Package, Clock, AlertTriangle, RefreshCw } from "lucide-react";

export const metadata: Metadata = { title: "Surtir" };
export const dynamic = "force-dynamic";

const PRIORITY_LABELS: Record<string, { label: string; class: string }> = {
  "0": { label: "Normal", class: "text-slate-400" },
  "1": { label: "Urgente", class: "text-amber-400" },
  "2": { label: "Muy urgente", class: "text-red-400" },
  "3": { label: "Muy urgente", class: "text-red-400" },
};

function formatDate(dateStr: string | false): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formatted = d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });

  if (diffDays < 0) return `${formatted} (atrasado)`;
  if (diffDays === 0) return `${formatted} (hoy)`;
  if (diffDays === 1) return `${formatted} (mañana)`;
  return formatted;
}

function isOverdue(dateStr: string | false): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export default async function SurtirPage() {
  let pickings: OdooPicking[] = [];
  let error = "";

  try {
    const sid = await getSessionId();
    pickings = await odooCall<OdooPicking[]>(
      sid,
      "stock.picking",
      "search_read",
      [
        [
          ["picking_type_id.code", "=", "outgoing"],
          ["state", "in", ["assigned", "confirmed", "waiting"]],
        ],
      ],
      {
        fields: [
          "id", "name", "state", "picking_type_id",
          "location_id", "location_dest_id",
          "origin", "scheduled_date", "create_date",
          "move_ids", "partner_id", "priority",
        ],
        order: "priority desc, scheduled_date asc, create_date asc",
        limit: 50,
      }
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al conectar con Odoo";
  }

  const assigned = pickings.filter((p) => p.state === "assigned");
  const waiting = pickings.filter((p) => p.state !== "assigned");

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Surtir Pedidos</h2>
          <p className="text-slate-500 text-xs mt-1">
            {pickings.length} pedido{pickings.length !== 1 ? "s" : ""} pendiente{pickings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <form action="/superinventarios/surtir" method="GET">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>Error de conexión: {error}</span>
        </div>
      )}

      {/* Ready to pick */}
      {assigned.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-green-400 uppercase tracking-widest px-1">
            Listos para surtir ({assigned.length})
          </h3>
          <div className="space-y-2">
            {assigned.map((p) => (
              <PickingCard key={p.id} picking={p} />
            ))}
          </div>
        </section>
      )}

      {/* Waiting / Confirmed */}
      {waiting.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest px-1">
            En espera ({waiting.length})
          </h3>
          <div className="space-y-2">
            {waiting.map((p) => (
              <PickingCard key={p.id} picking={p} />
            ))}
          </div>
        </section>
      )}

      {pickings.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Todo surtido</h3>
          <p className="text-slate-500 text-sm mt-1">
            No hay pedidos pendientes de surtir.
          </p>
        </div>
      )}
    </div>
  );
}

function PickingCard({ picking }: { picking: OdooPicking }) {
  const partner = Array.isArray(picking.partner_id) ? picking.partner_id[1] : null;
  const lineCount = picking.move_ids?.length ?? 0;
  const priority = PRIORITY_LABELS[picking.priority ?? "0"] ?? PRIORITY_LABELS["0"];
  const overdue = isOverdue(picking.scheduled_date);
  const isReady = picking.state === "assigned";

  return (
    <Link
      href={`/superinventarios/surtir/${picking.id}`}
      className={[
        "block rounded-xl border-2 p-4 transition-all active:scale-[0.98]",
        isReady
          ? "bg-slate-800/60 border-slate-700 hover:border-amber-500/50"
          : "bg-slate-800/30 border-slate-800 hover:border-slate-700",
        overdue ? "border-l-red-500" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Picking name + priority */}
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-100 text-sm">
              {picking.name}
            </span>
            {picking.priority && picking.priority !== "0" && (
              <span className={`text-[10px] font-bold uppercase ${priority.class}`}>
                {priority.label}
              </span>
            )}
            {isReady && (
              <span className="text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                Listo
              </span>
            )}
          </div>

          {/* Customer */}
          {partner && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-300 truncate">{partner}</span>
            </div>
          )}

          {/* Origin ref */}
          {picking.origin && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Ref: {picking.origin}
            </p>
          )}
        </div>

        {/* Right side: line count + date */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Package className="h-3.5 w-3.5" />
            <span className="tabular-nums">{lineCount} línea{lineCount !== 1 ? "s" : ""}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${overdue ? "text-red-400 font-semibold" : "text-slate-500"}`}>
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(picking.scheduled_date)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
