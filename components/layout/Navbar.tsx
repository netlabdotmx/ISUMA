"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Package, Menu, X, ChevronRight } from "lucide-react";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close menu on route change (link click)
  function close() {
    setOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-lg shadow-lg shadow-slate-200/50 border-b border-slate-100"
          : "bg-white/80 backdrop-blur-md border-b border-slate-100/80"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-300/50">
            <Sun className="h-5 w-5 text-white" />
          </div>
          <div className="leading-none">
            <span className="font-extrabold text-amber-600 text-lg tracking-tight">
              Sunny
            </span>
            <span className="ml-1.5 text-xs text-slate-400 font-normal hidden sm:inline">
              por ISUMA
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a
            href="#about"
            className="hover:text-amber-600 transition-colors relative group"
          >
            Nosotros
            <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-amber-500 transition-all group-hover:w-full rounded-full" />
          </a>
          <a
            href="#categories"
            className="hover:text-amber-600 transition-colors relative group"
          >
            Productos
            <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-amber-500 transition-all group-hover:w-full rounded-full" />
          </a>
          <a
            href="#contact"
            className="hover:text-amber-600 transition-colors relative group"
          >
            Contacto
            <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-amber-500 transition-all group-hover:w-full rounded-full" />
          </a>
        </nav>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href="/superinventarios"
            className="hidden sm:flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-600 transition-all duration-200 shadow-sm"
          >
            <Package className="h-4 w-4" />
            <span>SuperInventarios</span>
            <ChevronRight className="h-3 w-3 opacity-70" />
          </Link>

          {/* Hamburger - mobile only */}
          <button
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="md:hidden animate-slide-down border-t border-slate-100 bg-white/98 backdrop-blur-lg shadow-xl shadow-slate-200/60">
          <nav className="flex flex-col px-4 py-4 gap-1">
            <a
              href="#about"
              onClick={close}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              Nosotros
            </a>
            <a
              href="#categories"
              onClick={close}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              Productos
            </a>
            <a
              href="#contact"
              onClick={close}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              Contacto
            </a>
            <div className="mt-2 pt-3 border-t border-slate-100">
              <Link
                href="/superinventarios"
                onClick={close}
                className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-semibold px-4 py-3 rounded-xl hover:bg-amber-600 transition-all duration-200"
              >
                <Package className="h-4 w-4" />
                SuperInventarios
                <ChevronRight className="h-3 w-3 opacity-70" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
