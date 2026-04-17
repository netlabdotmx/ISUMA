"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ProductSearch } from "./ProductSearch";

export interface MoveLine {
  id: string;
  product_id: number;
  product_name: string;
  product_code: string;
  qty_demanded: number;
  qty_done: number;
  qty_available?: number;
}

interface MovementLinesProps {
  lines: MoveLine[];
  onChange: (lines: MoveLine[]) => void;
  showDone?: boolean;
  locationId?: number; // For live stock check
}

export function MovementLines({
  lines,
  onChange,
  showDone = false,
}: MovementLinesProps) {
  const [nextId, setNextId] = useState(1);

  function addLine() {
    const newLine: MoveLine = {
      id: `line-${nextId}`,
      product_id: 0,
      product_name: "",
      product_code: "",
      qty_demanded: 1,
      qty_done: 0,
    };
    onChange([...lines, newLine]);
    setNextId((n) => n + 1);
  }

  function removeLine(id: string) {
    onChange(lines.filter((l) => l.id !== id));
  }

  function updateLine(id: string, updates: Partial<MoveLine>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left pb-2 pr-3 text-slate-400 font-medium w-full">
                Producto
              </th>
              <th className="text-right pb-2 px-3 text-slate-400 font-medium whitespace-nowrap">
                Cantidad
              </th>
              {showDone && (
                <th className="text-right pb-2 px-3 text-slate-400 font-medium whitespace-nowrap">
                  Recibido
                </th>
              )}
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="py-2 pr-3">
                  {line.product_id === 0 ? (
                    <ProductSearch
                      placeholder="Seleccionar producto..."
                      onSelect={(p) =>
                        updateLine(line.id, {
                          product_id: p.id,
                          product_name: p.name,
                          product_code: p.default_code || "",
                          qty_available: p.qty_available,
                        })
                      }
                      clearOnSelect={false}
                    />
                  ) : (
                    <div>
                      <p className="text-slate-100 font-medium truncate max-w-xs">
                        {line.product_name}
                      </p>
                      {line.product_code && (
                        <p className="text-xs text-slate-400 font-mono">
                          {line.product_code}
                        </p>
                      )}
                      {line.qty_available !== undefined && (
                        <p className="text-xs text-slate-500">
                          Stock: {line.qty_available}
                        </p>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.qty_demanded}
                    onChange={(e) =>
                      updateLine(line.id, {
                        qty_demanded: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-20 text-right rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </td>
                {showDone && (
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.qty_done}
                      onChange={(e) =>
                        updateLine(line.id, {
                          qty_done: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-20 text-right rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                )}
                <td className="py-2 pl-2">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td
                  colSpan={showDone ? 4 : 3}
                  className="py-8 text-center text-slate-500 text-sm"
                >
                  No hay productos. Agrega una línea para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addLine}
        className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Agregar producto
      </button>
    </div>
  );
}
