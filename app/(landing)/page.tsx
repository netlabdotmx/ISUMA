import Link from "next/link";
import {
  Dog,
  Fish,
  Turtle,
  Bird,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Sun,
  Package,
  CheckCircle2,
  Award,
  Globe2,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Inicio | Comercializadora ISUMA · Sunny",
  description:
    "Comercializadora ISUMA — Importadores y distribuidores de productos Sunny para mascotas: perros, peces, reptiles y más.",
};

const categories = [
  {
    icon: Dog,
    label: "Perros",
    desc: "Huesos, comederos, juguetes y accesorios premium para tu mejor amigo.",
    gradient: "from-amber-400 to-orange-500",
    bgGlow: "bg-amber-500/10",
    border: "border-amber-200/60",
  },
  {
    icon: Fish,
    label: "Peces",
    desc: "Filtros de cascada, acuarios y accesorios para peces tropicales y de agua fría.",
    gradient: "from-blue-400 to-cyan-500",
    bgGlow: "bg-blue-500/10",
    border: "border-blue-200/60",
  },
  {
    icon: Turtle,
    label: "Reptiles",
    desc: "Terrarios, lámparas UV, sustratos y todo lo que necesita tu reptil.",
    gradient: "from-emerald-400 to-green-500",
    bgGlow: "bg-emerald-500/10",
    border: "border-emerald-200/60",
  },
  {
    icon: Bird,
    label: "Aves",
    desc: "Jaulas, alimento balanceado y juguetes para tus aves domésticas.",
    gradient: "from-violet-400 to-purple-500",
    bgGlow: "bg-violet-500/10",
    border: "border-violet-200/60",
  },
];

const stats = [
  { value: "10+", label: "Años de experiencia", icon: TrendingUp },
  { value: "500+", label: "Productos disponibles", icon: Package },
  { value: "200+", label: "Distribuidores activos", icon: Globe2 },
];

const features = [
  "Importación directa del fabricante",
  "Distribución a todo México",
  "Garantía de calidad internacional",
  "Soporte y asesoría personalizada",
  "Precios competitivos para distribuidores",
];

const contact = [
  {
    icon: MapPin,
    title: "Dirección",
    value: "CEDIS Comercializadora ISUMA\nZona Industrial, México",
  },
  { icon: Mail, title: "Correo electrónico", value: "ventas@isuma.mx" },
  { icon: Phone, title: "Teléfono", value: "+52 (55) 0000-0000" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-slate-950 min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-16 pb-28">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb-amber absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-amber-500/20 blur-[120px]" />
          <div className="orb-orange absolute top-1/2 -right-48 w-[40rem] h-[40rem] rounded-full bg-orange-500/15 blur-[130px]" />
          <div className="orb-yellow absolute -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-yellow-400/15 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            Distribuidores Oficiales de Productos Sunny
          </div>

          {/* Large brand icon — floating */}
          <div className="flex justify-center mb-8">
            <div className="animate-float relative">
              <div className="flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-2xl shadow-amber-500/40">
                <Sun className="h-12 w-12 sm:h-16 sm:w-16 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 blur-xl opacity-40 -z-10 scale-110" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Todo para tu{" "}
            <span className="shimmer-text">mascota favorita</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Importamos y distribuimos la línea completa de productos{" "}
            <strong className="text-amber-400 font-semibold">Sunny</strong> para
            perros, peces, reptiles y más. Calidad de importación directa al
            mejor precio.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#categories"
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-8 py-4 rounded-2xl hover:from-amber-400 hover:to-orange-400 transition-all duration-200 shadow-xl shadow-amber-500/30 text-sm sm:text-base"
            >
              Ver catálogo completo
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link
              href="/superinventarios"
              className="flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 backdrop-blur-sm text-sm sm:text-base"
            >
              <Package className="h-5 w-5" />
              Acceder a SuperInventarios
            </Link>
          </div>
        </div>

        {/* Bottom stats strip */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10">
          <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-white/10">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center py-5 px-4 gap-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-400">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 text-center leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute -bottom-px left-0 right-0 overflow-hidden">
          <svg
            viewBox="0 0 1440 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 56L48 49C96 42 192 28 288 21C384 14 480 14 576 21C672 28 768 42 864 42C960 42 1056 28 1152 21C1248 14 1344 14 1392 14L1440 14V56H1392C1344 56 1248 56 1152 56C1056 56 960 56 864 56C768 56 672 56 576 56C480 56 384 56 288 56C192 56 96 56 48 56H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-5">
              <Award className="h-3.5 w-3.5" />
              Sobre Nosotros
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
              Comercializadora{" "}
              <span className="sunny-gradient-text">ISUMA</span>
            </h2>
            <p className="text-slate-600 leading-relaxed text-base sm:text-lg mb-4">
              Somos una empresa mexicana especializada en la importación y
              distribución de productos para mascotas de la marca{" "}
              <strong className="text-amber-600">Sunny</strong>. Llevamos años
              conectando a distribuidores y tiendas de mascotas con productos de
              calidad internacional.
            </p>
            <p className="text-slate-500 leading-relaxed mb-8">
              Contamos con una amplia red de distribución a nivel nacional,
              respaldada por un sistema logístico moderno y un equipo
              comprometido con la satisfacción de nuestros clientes.
            </p>
            <ul className="space-y-3">
              {features.map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm sm:text-base">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-10 shadow-2xl shadow-slate-900/20">
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />
              <div className="relative flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-500/40 mb-6 animate-float">
                  <Sun className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={1.5} />
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">Sunny</p>
                <p className="text-slate-400 text-sm mb-8">Productos para mascotas</p>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                      <p className="text-xl sm:text-2xl font-extrabold text-amber-400">{s.value}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-2 sm:-right-6 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="text-sm font-semibold text-slate-700">Envíos a todo México</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section id="categories" className="py-20 sm:py-28 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-5">
              Categorías
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
              Productos para cada mascota
            </h2>
            <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto">
              Amplia variedad de productos Sunny, importados directamente para
              garantizar calidad y disponibilidad permanente.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className={`category-card group relative rounded-3xl bg-white border ${cat.border} p-6 sm:p-7 overflow-hidden shadow-sm hover:shadow-xl cursor-pointer`}
              >
                <div className={`absolute inset-0 ${cat.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl`} />
                <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <cat.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="relative font-extrabold text-slate-900 text-xl mb-2">{cat.label}</h3>
                <p className="relative text-slate-500 text-sm leading-relaxed">{cat.desc}</p>
                <ArrowRight className="relative mt-4 h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BRANDS ─── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest font-bold mb-10">
            Marcas que distribuimos
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 items-center">
            <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-6 sm:px-8 py-4 shadow-md shadow-amber-100">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <Sun className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">Sunny</span>
              <span className="hidden sm:block text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">Principal</span>
            </div>
            {["AquaClear", "PetLife", "ZooMax", "NaturalPet"].map((brand) => (
              <div key={brand} className="flex items-center px-5 sm:px-6 py-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-colors">
                <span className="text-lg sm:text-xl font-bold text-slate-400">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section
        id="contact"
        className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-br from-slate-950 to-slate-900 relative overflow-hidden"
      >
        <div className="absolute -top-32 right-0 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-orange-500/8 blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-5">
              Contacto
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              ¿Quieres ser{" "}
              <span className="shimmer-text">distribuidor?</span>
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
              Contáctanos y con gusto te informamos sobre nuestros programas de
              distribución y precios especiales.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {contact.map((item) => (
              <div
                key={item.title}
                className="relative bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-4 hover:bg-white/8 hover:border-amber-500/30 transition-all duration-300 backdrop-blur-sm group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-white text-base">{item.title}</h3>
                <p className="text-slate-400 text-sm whitespace-pre-line leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="mailto:ventas@isuma.mx"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-8 py-4 rounded-2xl hover:from-amber-400 hover:to-orange-400 transition-all duration-200 shadow-xl shadow-amber-500/30 text-sm sm:text-base"
            >
              <Mail className="h-5 w-5" />
              Enviar un correo
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-950 text-slate-400 py-10 sm:py-14 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">
            <div className="flex flex-col items-center sm:items-start gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Sun className="h-5 w-5 text-white" />
                </div>
                <span className="font-extrabold text-white text-lg">Comercializadora ISUMA</span>
              </div>
              <p className="text-xs text-slate-600 max-w-xs text-center sm:text-left">
                Importadores y distribuidores oficiales de la línea Sunny en México.
              </p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6 text-sm">
              <a href="#about" className="hover:text-amber-400 transition-colors">Nosotros</a>
              <a href="#categories" className="hover:text-amber-400 transition-colors">Productos</a>
              <a href="#contact" className="hover:text-amber-400 transition-colors">Contacto</a>
              <Link href="/superinventarios" className="text-amber-400 hover:text-amber-300 transition-colors font-semibold">
                SuperInventarios →
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} Comercializadora ISUMA. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
