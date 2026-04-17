"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  default_code: string | false;
  qty_available: number;
}

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
  clearOnSelect?: boolean;
}

export function ProductSearch({
  onSelect,
  placeholder = "Buscar producto...",
  className,
  clearOnSelect = false,
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/odoo/products?search=${encodeURIComponent(query)}&limit=10`
        );
        const data = await res.json();
        setResults(data.products ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 pl-9 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 shadow-xl overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-400">Buscando...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">
              Sin resultados para &quot;{query}&quot;
            </div>
          )}
          {!loading && results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product);
                if (clearOnSelect) {
                  setQuery("");
                  setResults([]);
                } else {
                  setQuery(product.name);
                }
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors"
            >
              <div className="text-sm text-slate-100 font-medium truncate">
                {product.name}
              </div>
              <div className="text-xs text-slate-400 flex gap-2 mt-0.5">
                {product.default_code && (
                  <span className="font-mono">{product.default_code}</span>
                )}
                <span>Disponible: {product.qty_available}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
