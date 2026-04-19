"use client";

import { useState, useEffect } from "react";
import { Search, RefreshCw, ScanBarcode, X, Pencil } from "lucide-react";
import Link from "next/link";
import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { RackFrontalView } from "@/components/warehouse/RackFrontalView";
import { ProductSearch } from "@/components/inventory/ProductSearch";
import type { OdooLocation, OdooQuant } from "@/lib/odoo";

interface SelectedProduct {
  id: number;
  name: string;
}

interface SelectedRack {
  rackId: string; // Rack letter, e.g. "A"
}

export default function BuscarPage() {
  const [locations, setLocations] = useState<OdooLocation[]>([]);
  const [allQuants, setAllQuants] = useState<OdooQuant[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [highlightedLocations, setHighlightedLocations] = useState<number[]>([]);
  const [highlightQuants, setHighlightQuants] = useState<OdooQuant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRack, setSelectedRack] = useState<SelectedRack | null>(null);

  // Load data on mount
  useEffect(() => {
    if (locations.length > 0) return;
    async function load() {
      setLoading(true);
      try {
        const [locRes, stockRes] = await Promise.all([
          fetch("/api/odoo/locations?warehouse_id=1"),
          fetch("/api/odoo/stock"),
        ]);
        const locData = await locRes.json();
        const stockData = await stockRes.json();
        setLocations(locData.locations ?? []);
        setAllQuants(stockData.quants ?? []);
      } catch (e) {
        console.error("Error loading layout data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locations.length]);



  async function handleProductSelect(product: { id: number; name: string }) {
    setSelectedProduct(product);
    setSelectedRack(null);
    try {
      const res = await fetch(`/api/odoo/stock?product_id=${product.id}`);
      const data = await res.json();
      const quants: OdooQuant[] = data.quants ?? [];
      const locIds = quants
        .filter((q) => q.quantity > 0)
        .map((q) => (Array.isArray(q.location_id) ? q.location_id[0] : 0));
      setHighlightedLocations(locIds);
      setHighlightQuants(quants);
    } catch (e) {
      console.error("Error searching product stock", e);
    }
  }

  function clearHighlight() {
    setSelectedProduct(null);
    setHighlightedLocations([]);
    setHighlightQuants([]);
  }

  function handleRackClick(rackLabel: string, _locationId: number | null) {
    // Extract rack letter from labels like "A03", "B12", "C"
    const rackId = rackLabel.replace(/[^A-Za-z]/g, "").toUpperCase() || rackLabel;
    setSelectedRack({ rackId });
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Buscar en Almacén</h2>
          <p className="text-slate-500 text-xs mt-1">
            {selectedRack
              ? `Vista frontal: Rack ${selectedRack.rackId}`
              : "Busca un producto y localízalo en el mapa"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/layout"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Editar plano</span>
          </Link>
          <button
            onClick={() => {
              setLocations([]);
              setAllQuants([]);
            }}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ScanBarcode className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Buscar producto
          </h3>
        </div>
        <div className="flex gap-3">
          <ProductSearch
            onSelect={handleProductSelect}
            placeholder="Nombre, código o escanea…"
            className="flex-1"
          />
          {selectedProduct && (
            <button
              onClick={clearHighlight}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
        {selectedProduct && (
          <p className="mt-2 text-xs text-amber-400">
            Mostrando ubicaciones para: <strong>{selectedProduct.name}</strong>
            {highlightedLocations.length === 0 && " — Sin stock en CEDIS"}
          </p>
        )}
      </div>

      {/* Stock locations list (below on mobile, side on tablet+) */}
      {selectedProduct && highlightQuants.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Ubicaciones con stock ({highlightQuants.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {highlightQuants
              .filter((q) => q.quantity > 0)
              .sort((a, b) => b.quantity - a.quantity)
              .map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 text-sm"
                >
                  <span className="text-slate-300 font-mono text-xs">
                    {Array.isArray(q.location_id) ? q.location_id[1] : "—"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-100 font-bold tabular-nums">
                      {q.quantity}
                    </span>
                    {q.reserved_quantity > 0 && (
                      <span className="text-xs text-amber-400 tabular-nums">
                        ({q.reserved_quantity} res.)
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl bg-slate-900 border border-slate-700 p-12 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            Cargando datos del almacén...
          </div>
        </div>
      )}

      {/* Aerial view OR Rack frontal view */}
      {!loading && !selectedRack && (
        <WarehouseLayout
          locations={locations}
          quants={allQuants}
          highlightedLocations={highlightedLocations}
          highlightQuants={highlightQuants}
          onRackClick={handleRackClick}
        />
      )}

      {!loading && selectedRack && (
        <RackFrontalView
          rackId={selectedRack.rackId}
          locations={locations}
          quants={allQuants}
          highlightedLocations={highlightedLocations}
          highlightQuants={highlightQuants}
          onBack={() => setSelectedRack(null)}
        />
      )}
    </div>
  );
}
