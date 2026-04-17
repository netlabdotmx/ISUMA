"use client";

import { useState, useEffect } from "react";
import { Search, RefreshCw, Pencil, X } from "lucide-react";
import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { LayoutEditor } from "@/components/warehouse/LayoutEditor";
import { LocationDrawer } from "@/components/warehouse/LocationDrawer";
import { ProductSearch } from "@/components/inventory/ProductSearch";
import type { RackCellData } from "@/components/warehouse/RackCell";
import type { OdooLocation, OdooQuant } from "@/lib/odoo";

interface SelectedProduct {
  id: number;
  name: string;
}

export default function LayoutClientPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  function closeEditor() {
    setEditorOpen(false);
    setLayoutVersion((v) => v + 1); // force WarehouseLayout to re-read localStorage
  }
  const [locations, setLocations] = useState<OdooLocation[]>([]);
  const [allQuants, setAllQuants] = useState<OdooQuant[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [highlightedLocations, setHighlightedLocations] = useState<number[]>([]);
  const [highlightQuants, setHighlightQuants] = useState<OdooQuant[]>([]);
  const [loading, setLoading] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLocation, setDrawerLocation] = useState<RackCellData | null>(null);
  const [drawerQuants, setDrawerQuants] = useState<OdooQuant[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Load inventory data on mount
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

  async function handleLocationClick(cell: RackCellData) {
    setDrawerLocation(cell);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerQuants([]);
    try {
      const res = await fetch(`/api/odoo/stock?location_id=${cell.locationId}`);
      const data = await res.json();
      setDrawerQuants(data.quants ?? []);
    } catch (e) {
      console.error("Error loading location quants", e);
    } finally {
      setDrawerLoading(false);
    }
  }

  return (
    <>
      {/* ── Editor modal (full-screen overlay) ── */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-100">Editor de Plano</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Diseña la cuadrícula de tu CEDIS — arrastra para pintar
              </p>
            </div>
            <button
              onClick={closeEditor}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <X className="h-4 w-4" />
              Cerrar editor
            </button>
          </div>
          {/* Editor fills the rest */}
          <div className="flex-1 min-h-0">
            <LayoutEditor />
          </div>
        </div>
      )}

      {/* ── Main inventory view ── */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Layout del Almacén</h2>
            <p className="text-slate-400 text-sm mt-1">
              Vista aérea interactiva — CEDIS
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Refresh */}
            <button
              onClick={() => {
                setLocations([]);
                setAllQuants([]);
              }}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {/* Edit layout button */}
            <button
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md shadow-amber-500/20"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar plano
            </button>
          </div>
        </div>

        {/* Product search */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Buscar producto en el almacén
            </h3>
          </div>
          <div className="flex gap-3">
            <ProductSearch
              onSelect={handleProductSelect}
              placeholder="Escribe el nombre o código del producto..."
              className="flex-1"
            />
            {selectedProduct && (
              <button
                onClick={clearHighlight}
                className="px-3 py-2 text-sm text-slate-400 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors whitespace-nowrap"
              >
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

        {/* Loading */}
        {loading && (
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              Cargando datos del almacén...
            </div>
          </div>
        )}

        {/* Warehouse layout */}
        {!loading && (
          <WarehouseLayout
            key={layoutVersion}
            locations={locations}
            quants={allQuants}
            highlightedLocations={highlightedLocations}
            highlightQuants={highlightQuants}
            onLocationClick={handleLocationClick}
          />
        )}

        {/* Location drawer */}
        <LocationDrawer
          open={drawerOpen}
          location={drawerLocation}
          quants={drawerQuants}
          loading={drawerLoading}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </>
  );
}
