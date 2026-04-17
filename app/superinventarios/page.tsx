import { Suspense } from "react";
import type { Metadata } from "next";
import { odooCall } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";
import { MetricCard } from "@/components/ui/MetricCard";
import { PickingStatusBadge } from "@/components/inventory/PickingStatusBadge";
import {
  Package,
  MapPin,
  ArrowRightLeft,
  PackageSearch,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface Picking {
  id: number;
  name: string;
  state: string;
  picking_type_id: [number, string];
  origin: string | false;
  scheduled_date: string | false;
  create_date: string;
}

async function getDashboardData() {
  const sid = await getSessionId();
  const [productCount, locationCount, pendingCount, incomingCount, recentPickings] =
    await Promise.all([
      odooCall<number>(sid, "product.product", "search_count", [
        [["type", "in", ["consu", "product"]]],
      ]),
      odooCall<number>(sid, "stock.location", "search_count", [
        [["usage", "=", "internal"], ["active", "=", true]],
      ]),
      odooCall<number>(sid, "stock.picking", "search_count", [
        [["state", "in", ["draft", "waiting", "confirmed", "assigned"]]],
      ]),
      odooCall<number>(sid, "stock.picking", "search_count", [
        [
          ["state", "in", ["draft", "waiting", "confirmed", "assigned"]],
          ["picking_type_id.code", "=", "incoming"],
        ],
      ]),
      odooCall<Picking[]>(
        sid,
        "stock.picking",
        "search_read",
        [[["state", "!=", "cancel"]]],
        {
          fields: [
            "id", "name", "state", "picking_type_id",
            "origin", "scheduled_date", "create_date",
          ],
          limit: 10,
          order: "create_date desc",
        }
      ),
    ]);

  return { productCount, locationCount, pendingCount, incomingCount, recentPickings };
}

function formatDate(dateStr: string | false): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  let data = {
    productCount: 0,
    locationCount: 0,
    pendingCount: 0,
    incomingCount: 0,
    recentPickings: [] as Picking[],
  };
  let error = "";

  try {
    data = await getDashboardData();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al conectar con Odoo";
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            Vista general del inventario en tiempo real
          </p>
        </div>
        <form action="/superinventarios" method="GET">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </form>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-sm text-red-300">
          ⚠️ Error de conexión a Odoo: {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total de productos"
          value={data.productCount}
          icon={Package}
          accent="amber"
        />
        <MetricCard
          title="Ubicaciones activas"
          value={data.locationCount}
          icon={MapPin}
          accent="blue"
        />
        <MetricCard
          title="Traslados pendientes"
          value={data.pendingCount}
          icon={ArrowRightLeft}
          accent="orange"
        />
        <MetricCard
          title="Recepciones pendientes"
          value={data.incomingCount}
          icon={PackageSearch}
          accent="green"
        />
      </div>

      {/* Recent movements */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="font-semibold text-slate-100">Últimos movimientos</h3>
          <Link
            href="/superinventarios/traslados"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">
                  Referencia
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">
                  Tipo
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium hidden sm:table-cell">
                  Origen
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium hidden lg:table-cell">
                  Fecha
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.recentPickings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    {error
                      ? "Sin datos disponibles"
                      : "No hay movimientos registrados"}
                  </td>
                </tr>
              )}
              {data.recentPickings.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/superinventarios/traslados/${p.id}`}
                      className="font-mono text-slate-100 hover:text-amber-400 transition-colors"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 hidden md:table-cell">
                    {Array.isArray(p.picking_type_id)
                      ? p.picking_type_id[1]
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell truncate max-w-xs">
                    {p.origin || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                    {formatDate(p.scheduled_date || p.create_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <PickingStatusBadge state={p.state} />
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
