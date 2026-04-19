import type { Metadata } from "next";
import Link from "next/link";
import { odooCall, type OdooLocation, type OdooQuant } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";
import { formatPhysicalPosition } from "@/lib/location";
import { ClipboardCheck, MapPin, Package, AlertTriangle, RefreshCw } from "lucide-react";

export const metadata: Metadata = { title: "Contar" };
export const dynamic = "force-dynamic";

interface LocationSummary {
  id: number;
  name: string;
  complete_name: string;
  zone: string;
  physicalPos: string | null;
  skuCount: number;
}

function extractZone(completeName: string): string {
  // Try to extract zone from location name (e.g., "WH/A-01-1" → zone "A")
  const match = completeName.match(/\/([A-Za-z])/);
  return match ? match[1].toUpperCase() : "Otros";
}

export default async function ContarPage() {
  let locations: LocationSummary[] = [];
  let error = "";

  try {
    const sid = await getSessionId();

    // Get all internal locations (try with physical position fields, fall back if not installed)
    const baseFields = ["id", "name", "complete_name", "location_id", "usage"];
    const customFields = ["x_physical_rack", "x_physical_column", "x_physical_level", "x_abc_zone"];
    let rawLocations: OdooLocation[];

    try {
      rawLocations = await odooCall<OdooLocation[]>(
        sid,
        "stock.location",
        "search_read",
        [[["usage", "=", "internal"], ["active", "=", true]]],
        { fields: [...baseFields, ...customFields], order: "complete_name asc" }
      );
    } catch {
      rawLocations = await odooCall<OdooLocation[]>(
        sid,
        "stock.location",
        "search_read",
        [[["usage", "=", "internal"], ["active", "=", true]]],
        { fields: baseFields, order: "complete_name asc" }
      );
    }

    // Get quant counts per location (only positive stock)
    const quants = await odooCall<{ location_id: [number, string] }[]>(
      sid,
      "stock.quant",
      "search_read",
      [[["quantity", ">", 0], ["location_id.usage", "=", "internal"]]],
      {
        fields: ["location_id"],
        limit: 5000,
      }
    );

    // Count distinct products per location
    const skuCountByLocation = new Map<number, number>();
    for (const q of quants) {
      const locId = q.location_id[0];
      skuCountByLocation.set(locId, (skuCountByLocation.get(locId) ?? 0) + 1);
    }

    locations = rawLocations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      complete_name: loc.complete_name,
      zone: loc.x_abc_zone ? String(loc.x_abc_zone) : extractZone(loc.complete_name),
      physicalPos: formatPhysicalPosition(loc),
      skuCount: skuCountByLocation.get(loc.id) ?? 0,
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al conectar con Odoo";
  }

  // Group by zone
  const grouped = new Map<string, LocationSummary[]>();
  for (const loc of locations) {
    const list = grouped.get(loc.zone) ?? [];
    list.push(loc);
    grouped.set(loc.zone, list);
  }
  const sortedZones = [...grouped.keys()].sort();

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Contar Inventario</h2>
          <p className="text-slate-500 text-xs mt-1">
            {locations.length} ubicación{locations.length !== 1 ? "es" : ""} · Conteo cíclico
          </p>
        </div>
        <form action="/superinventarios/contar" method="GET">
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

      {sortedZones.map((zone) => {
        const locs = grouped.get(zone) ?? [];
        return (
          <section key={zone} className="space-y-2">
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest px-1">
              Zona {zone} ({locs.length})
            </h3>
            <div className="space-y-2">
              {locs.map((loc) => (
                <LocationCard key={loc.id} location={loc} />
              ))}
            </div>
          </section>
        );
      })}

      {locations.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
            <ClipboardCheck className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Sin ubicaciones</h3>
          <p className="text-slate-500 text-sm mt-1">
            No se encontraron ubicaciones internas.
          </p>
        </div>
      )}
    </div>
  );
}

function LocationCard({ location }: { location: LocationSummary }) {
  return (
    <Link
      href={`/superinventarios/contar/${location.id}`}
      className="block rounded-xl border-2 bg-slate-800/60 border-slate-700 hover:border-cyan-500/50 p-4 transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="font-mono font-bold text-slate-100 text-sm truncate">
              {location.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate pl-6">
            {location.complete_name}
          </p>
          {location.physicalPos && (
            <p className="text-[10px] text-cyan-500 font-mono mt-0.5 pl-6">
              Pos: {location.physicalPos}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          <Package className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {location.skuCount} SKU{location.skuCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
