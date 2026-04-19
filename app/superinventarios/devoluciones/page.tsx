import type { Metadata } from "next";
import Link from "next/link";
import { odooCall, type OdooPicking } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";
import {
  RotateCcw,
  User,
  Package,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ArrowDownLeft,
} from "lucide-react";

export const metadata: Metadata = { title: "Devoluciones" };
export const dynamic = "force-dynamic";

function formatDate(dateStr: string | false): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DevolucionesPage() {
  let completedPickings: OdooPicking[] = [];
  let returnPickings: OdooPicking[] = [];
  let error = "";

  try {
    const sid = await getSessionId();

    // Fetch completed outgoing pickings (can create returns from these)
    const [completed, returns] = await Promise.all([
      odooCall<OdooPicking[]>(
        sid,
        "stock.picking",
        "search_read",
        [
          [
            ["picking_type_id.code", "=", "outgoing"],
            ["state", "=", "done"],
          ],
        ],
        {
          fields: [
            "id", "name", "state", "picking_type_id",
            "location_id", "location_dest_id",
            "origin", "scheduled_date", "date_done", "create_date",
            "move_ids", "partner_id", "priority",
          ],
          order: "date_done desc",
          limit: 30,
        }
      ),
      // Fetch return pickings (incoming pickings created from returns)
      odooCall<OdooPicking[]>(
        sid,
        "stock.picking",
        "search_read",
        [
          [
            ["picking_type_id.code", "=", "incoming"],
            ["origin", "like", "Return of"],
            ["state", "in", ["draft", "waiting", "confirmed", "assigned"]],
          ],
        ],
        {
          fields: [
            "id", "name", "state", "picking_type_id",
            "location_id", "location_dest_id",
            "origin", "scheduled_date", "date_done", "create_date",
            "move_ids", "partner_id", "priority",
          ],
          order: "create_date desc",
          limit: 20,
        }
      ),
    ]);

    completedPickings = completed;
    returnPickings = returns;
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al conectar con Odoo";
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Devoluciones</h2>
          <p className="text-slate-500 text-xs mt-1">
            Gestiona devoluciones de mercancía
          </p>
        </div>
        <form action="/superinventarios/devoluciones" method="GET">
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

      {/* Active returns in progress */}
      {returnPickings.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest px-1">
            <ArrowDownLeft className="h-3 w-3 inline mr-1" />
            Devoluciones pendientes ({returnPickings.length})
          </h3>
          <div className="space-y-2">
            {returnPickings.map((p) => (
              <ReturnCard key={p.id} picking={p} />
            ))}
          </div>
        </section>
      )}

      {/* Completed pickings eligible for returns */}
      {completedPickings.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-green-400 uppercase tracking-widest px-1">
            <CheckCircle2 className="h-3 w-3 inline mr-1" />
            Entregas completadas ({completedPickings.length})
          </h3>
          <p className="text-[11px] text-slate-600 px-1">
            Selecciona una entrega para crear una devolución
          </p>
          <div className="space-y-2">
            {completedPickings.map((p) => (
              <CompletedPickingCard key={p.id} picking={p} />
            ))}
          </div>
        </section>
      )}

      {completedPickings.length === 0 && returnPickings.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
            <RotateCcw className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Sin actividad</h3>
          <p className="text-slate-500 text-sm mt-1">
            No hay entregas completadas ni devoluciones pendientes.
          </p>
        </div>
      )}
    </div>
  );
}

function CompletedPickingCard({ picking }: { picking: OdooPicking }) {
  const partner = Array.isArray(picking.partner_id) ? picking.partner_id[1] : null;
  const lineCount = picking.move_ids?.length ?? 0;

  return (
    <Link
      href={`/superinventarios/devoluciones/${picking.id}`}
      className="block rounded-xl border-2 bg-slate-800/40 border-slate-700/50 hover:border-amber-500/50 p-4 transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-100 text-sm">
              {picking.name}
            </span>
            <span className="text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
              Completado
            </span>
          </div>
          {partner && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-300 truncate">{partner}</span>
            </div>
          )}
          {picking.origin && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Ref: {picking.origin}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Package className="h-3.5 w-3.5" />
            <span className="tabular-nums">{lineCount} línea{lineCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(picking.date_done)}</span>
          </div>
          <div className="mt-1">
            <RotateCcw className="h-4 w-4 text-amber-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ReturnCard({ picking }: { picking: OdooPicking }) {
  const partner = Array.isArray(picking.partner_id) ? picking.partner_id[1] : null;
  const lineCount = picking.move_ids?.length ?? 0;
  const isReady = picking.state === "assigned";

  return (
    <Link
      href={`/superinventarios/traslados/${picking.id}`}
      className={[
        "block rounded-xl border-2 p-4 transition-all active:scale-[0.98]",
        isReady
          ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
          : "bg-slate-800/30 border-slate-800 hover:border-slate-700",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="font-mono font-bold text-slate-100 text-sm">
              {picking.name}
            </span>
            {isReady && (
              <span className="text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                Listo
              </span>
            )}
          </div>
          {partner && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-300 truncate">{partner}</span>
            </div>
          )}
          {picking.origin && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {picking.origin}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Package className="h-3.5 w-3.5" />
            <span className="tabular-nums">{lineCount} línea{lineCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(picking.create_date)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
