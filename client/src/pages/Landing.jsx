import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function Material({ name, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

/* Contador animado (dato de marketing inventado) */
function useCountUp(target, active, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active || target == null) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

function Stat({ activo, icono, color, titulo, valor, sufijo }) {
  const v = useCountUp(valor, activo);
  return (
    <div className="lk-card p-6 flex flex-col gap-3">
      <span className={`lk-kpi-icon ${color}`}>
        <Material name={icono} className="text-[22px]" />
      </span>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-[#1B2430] leading-tight">
          {valor == null ? "—" : `${v.toLocaleString("es-VE")}${sufijo ? sufijo : ""}`}
        </span>
        <span className="text-sm text-[#667085] mt-1">{titulo}</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const statsRef = useRef(null);
  const [statsActivos, setStatsActivos] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) {
      setStatsActivos(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStatsActivos(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing-kanban min-h-screen bg-[#F0F1F3] text-[#1B2430] overflow-x-hidden">
      {/* NAVBAR */}
      <header className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E6E8EC]">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-[70px] px-5">
          <a href="#top" className="flex items-center gap-2.5">
            {/* Logo tipo splash KANBAN */}
            <span className="relative w-8 h-8" aria-hidden>
              <span className="absolute bottom-0 left-0 w-8 h-8 rounded-[5px] bg-[#009ED8]" />
              <span className="absolute top-0 right-0 w-[22px] h-[22px] bg-[#0ACF83] rounded-sm" />
              <span className="absolute top-[6px] right-[3px] w-[13px] h-[13px] bg-white rounded-sm" />
            </span>
            <span className="font-semibold text-[#009ED8] text-lg tracking-tight">Tu Auditor</span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#48505E]">
            <a href="#que-hacemos" className="hover:text-[#1366D9] transition-colors">Qué hacemos</a>
            <a href="#como-funciona" className="hover:text-[#1366D9] transition-colors">Cómo funciona</a>
            <a href="#resultados" className="hover:text-[#1366D9] transition-colors">Resultados</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold h-10 px-5 rounded-lg flex items-center gap-2 border border-[#D0D3D9] text-[#48505E] hover:bg-[#F0F1F3] hover:text-[#1366D9] transition-colors"
            >
              <Material name="login" className="text-base" />
              Iniciar sesión
            </Link>
            <Link
              to="/inicio"
              className="bg-[#1366D9] text-white text-sm font-semibold h-10 px-5 rounded-lg flex items-center gap-2 hover:bg-[#0f56b6] transition-colors shadow-sm"
            >
              <Material name="barcode_scanner" className="text-base" />
              Probar DEMO
            </Link>
          </div>
          {/* Mobile hamburger */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-[#48505E]"
            onClick={() => setMenu((m) => !m)}
            aria-label="Menú"
          >
            <Material name={menu ? "close" : "menu"} className="text-2xl" />
          </button>
        </div>
        {menu && (
          <div className="md:hidden bg-white border-t border-[#E6E8EC] px-5 py-4 flex flex-col gap-3">
            <a href="#que-hacemos" onClick={() => setMenu(false)} className="text-[#48505E] font-medium">Qué hacemos</a>
            <a href="#como-funciona" onClick={() => setMenu(false)} className="text-[#48505E] font-medium">Cómo funciona</a>
            <a href="#resultados" onClick={() => setMenu(false)} className="text-[#48505E] font-medium">Resultados</a>
            <Link to="/login" onClick={() => setMenu(false)} className="text-[#1366D9] font-semibold flex items-center gap-2 mt-1">
              <Material name="login" className="text-base" /> Iniciar sesión
            </Link>
            <Link to="/inicio" onClick={() => setMenu(false)} className="bg-[#1366D9] text-white text-sm font-semibold h-11 px-5 rounded-lg flex items-center justify-center gap-2 mt-1">
              <Material name="barcode_scanner" className="text-base" />
              Probar DEMO
            </Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="max-w-6xl mx-auto px-5 pt-14 pb-16 md:pt-24 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6 lk-fade-up">
            <span className="inline-flex items-center gap-2 w-fit bg-white border border-[#E6E8EC] text-[#1366D9] text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm">
              <Material name="bolt" className="text-base" />
              Inventario rápido, decisiones seguras
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-[#1B2430]">
              Escanea.
              <br />
              Cuenta.
              <br />
              <span className="text-[#1366D9]">Decide.</span>
            </h1>
            <p className="text-lg text-[#667085] max-w-xl leading-relaxed">
              La forma más fácil de auditar tu inventario con el celular. Apunta al
              código de barras y conviértelo en decisiones de reposición, sin planillas
              ni errores manuales.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Link
                to="/inicio"
                className="bg-[#1366D9] text-white font-semibold h-[56px] px-8 rounded-xl flex items-center justify-center gap-2 hover:bg-[#0f56b6] transition-colors shadow-md shadow-[#1366D9]/20"
              >
                <Material name="barcode_scanner" className="text-xl" />
                Probar DEMO
              </Link>
              <a
                href="#solicitar"
                className="bg-white border border-[#D0D3D9] text-[#1366D9] font-semibold h-[56px] px-8 rounded-xl flex items-center justify-center gap-2 hover:bg-[#F0F1F3] transition-colors"
              >
                <Material name="event" className="text-xl" />
                Solicitar reunión
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#667085] mt-2">
              <span className="flex items-center gap-1.5">
                <Material name="check_circle" className="text-[#0ACF83] text-base" /> Sin instalación
              </span>
              <span className="flex items-center gap-1.5">
                <Material name="check_circle" className="text-[#0ACF83] text-base" /> En tu celular
              </span>
              <span className="flex items-center gap-1.5">
                <Material name="check_circle" className="text-[#0ACF83] text-base" /> 100% web
              </span>
            </div>
          </div>

          {/* Teléfono demo flotante */}
          <div className="relative flex justify-center">
            <div className="absolute -inset-8 bg-[#1366D9]/10 rounded-[3rem] blur-3xl -z-10" aria-hidden />
            <div className="lk-float">
              <MobileDemo />
            </div>
          </div>
        </div>
      </section>

      {/* RESULTADOS (stats inventadas de marketing) */}
      <section id="resultados" ref={statsRef} className="max-w-6xl mx-auto px-5 pb-16 md:pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat activo={statsActivos} icono="verified_user" color="bg-[#E8F1FD] text-[#1366D9]" valor={99} sufijo="%" titulo="Precisión en el conteo" />
          <Stat activo={statsActivos} icono="timer" color="bg-[#ECEAFF] text-[#6E5AE0]" valor={3} sufijo="x" titulo="Más rápido que auditar a mano" />
          <Stat activo={statsActivos} icono="inventory_2" color="bg-[#EBFFED] text-[#10A760]" valor={15000} titulo="Productos en el catálogo" />
          <Stat activo={statsActivos} icono="trending_up" color="bg-[#FFEEDB] text-[#F79009]" valor={40} sufijo="%" titulo="Menos quiebres de stock" />
        </div>
      </section>

      {/* QUÉ HACEMOS */}
      <section id="que-hacemos" className="bg-white border-y border-[#E6E8EC] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1B2430] mb-3">Hecho para el conteo real</h2>
            <p className="text-[#667085] max-w-2xl mx-auto text-lg">
              Del escáner a la decisión sin intermediarios. Cada unidad que cuentas
              queda registrada contra la referencia correcta de tu catálogo.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icono: "document_scanner", bg: "bg-[#E8F1FD]", color: "text-[#1366D9]", titulo: "Audita con el celular", texto: "Escaneo continuo de códigos de barras. Apuntas y el sistema cuenta solo, sin escribir ningún número." },
              { icono: "insights", bg: "bg-[#ECEAFF]", color: "text-[#6E5AE0]", titulo: "Ve tu stock en segundos", texto: "Paneles con los artículos, las categorías y el estado de tu inventario actualizados al instante." },
              { icono: "notifications_active", bg: "bg-[#FFEEDB]", color: "text-[#F79009]", titulo: "Decide qué reponer", texto: "Sabes qué falta y qué está en riesgo antes de que se convierta en un problema de venta." },
            ].map((c) => (
              <div key={c.titulo} className="lk-card p-8 flex flex-col items-start gap-4 hover:shadow-lg transition-shadow">
                <span className={`lk-kpi-icon ${c.bg} ${c.color}`}>
                  <Material name={c.icono} className="text-[24px]" />
                </span>
                <h3 className="text-lg font-semibold text-[#1B2430]">{c.titulo}</h3>
                <p className="text-[#667085] leading-relaxed">{c.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="bg-[#F0F1F3] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B2430] text-center mb-2">Cómo funciona</h2>
          <p className="text-[#667085] text-center max-w-xl mx-auto mb-12">
            Tres pasos simples, pensados para que cualquier negocio lo use desde el primer día.
          </p>
          <div className="grid gap-4 md:grid-cols-3 relative">
            {[
              { n: "1", titulo: "Escanea", texto: "Apunta a cualquier código de barras del producto. El sistema lo identifica al instante.", color: "#1366D9", bg: "#E8F1FD" },
              { n: "2", titulo: "Verifica", texto: "Confirma artículo y cantidad. Lote, vencimiento y ubicación quedan guardados.", color: "#0ACF83", bg: "#EBFFED" },
              { n: "3", titulo: "Decide", texto: "Los gráficos te señalan qué reponer y en qué producto concentrar tu compra.", color: "#F79009", bg: "#FFEEDB" },
            ].map((p) => (
              <div key={p.n} className="lk-card p-8 flex flex-col items-center text-center gap-4">
                <span
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-sm"
                  style={{ backgroundColor: p.color }}
                >
                  {p.n}
                </span>
                <h4 className="text-lg font-semibold text-[#1B2430]">{p.titulo}</h4>
                <p className="text-[#667085] leading-relaxed">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SOLICITAR */}
      <section id="solicitar" className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#1366D9] to-[#009ED8] px-6 py-12 md:px-16 md:py-16 text-center text-white shadow-lg">
          <Material name="inventory_2" className="text-4xl mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Lleva Tu Auditor a tu negocio</h2>
          <p className="max-w-xl mx-auto text-white/85 text-lg mb-8">
            Pide una reunión y te mostramos cómo una auditoría de inventario que antes
            tomaba un día entero ahora se hace en minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:contacto@tuauditor.com?subject=Solicitud%20de%20reuni%C3%B3n"
              className="bg-white text-[#1366D9] font-semibold h-[52px] px-8 rounded-xl flex items-center justify-center gap-2 hover:bg-[#F0F1F3] transition-colors"
            >
              <Material name="event" className="text-xl" />
              Solicitar reunión
            </a>
            <Link
              to="/inicio"
              className="bg-[#0f56b6] text-white font-semibold h-[52px] px-8 rounded-xl flex items-center justify-center gap-2 hover:bg-[#0b4a9c] transition-colors border border-white/20"
            >
              <Material name="barcode_scanner" className="text-xl" />
              Probar DEMO
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#E6E8EC]">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="relative w-6 h-6" aria-hidden>
              <span className="absolute bottom-0 left-0 w-6 h-6 rounded-[4px] bg-[#009ED8]" />
              <span className="absolute top-0 right-0 w-[16px] h-[16px] bg-[#0ACF83] rounded-sm" />
              <span className="absolute top-[4px] right-[2px] w-[9px] h-[9px] bg-white rounded-sm" />
            </span>
            <span className="font-semibold text-[#009ED8]">Tu Auditor</span>
          </div>
          <p className="text-sm text-[#667085] text-center">
            Inventario general para cualquier negocio. Hecho con precisión.
          </p>
          <div className="flex items-center gap-4 text-sm text-[#667085]">
            <a href="#top" className="hover:text-[#1366D9]">Inicio</a>
            <a href="#que-hacemos" className="hover:text-[#1366D9]">Qué hacemos</a>
          </div>
        </div>
      </footer>

      {/* FAB móvil para probar demo */}
      <Link
        to="/inicio"
        className="md:hidden fixed bottom-5 right-5 z-50 w-14 h-14 bg-[#1366D9] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#1366D9]/30"
        aria-label="Probar DEMO"
      >
        <Material name="barcode_scanner" className="text-2xl" />
      </Link>
    </div>
  );
}

/* Simulación de la app en el teléfono (más vendedor, datos inventados) */
function MobileDemo() {
  return (
    <div className="relative w-[280px] h-[560px] bg-[#0f1115] rounded-[2.6rem] p-[10px] shadow-[0_24px_48px_rgba(16,24,40,0.28)]">
      <div className="relative w-full h-full bg-white rounded-[2.1rem] overflow-hidden flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#0f1115] rounded-b-2xl z-20" />
        {/* App header */}
        <div className="flex items-center justify-between px-5 pt-9 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative w-6 h-6" aria-hidden>
              <span className="absolute bottom-0 left-0 w-6 h-6 rounded-[4px] bg-[#009ED8]" />
              <span className="absolute top-0 right-0 w-[16px] h-[16px] bg-[#0ACF83] rounded-sm" />
            </span>
            <span className="font-semibold text-[#1B2430] text-sm">Tu Auditor</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-[#667085]">
            <span className="material-symbols-outlined text-sm">wifi</span>
            <span className="material-symbols-outlined text-sm">battery_full</span>
          </span>
        </div>
        {/* Scanner */}
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden relative aspect-[1.05] bg-[#0b1220]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#15335f,#0b1220)]" />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72%] h-[46%]">
            <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1366D9] rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1366D9] rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1366D9] rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1366D9] rounded-br-lg" />
            <span className="absolute left-0 right-0 h-[2px] bg-[#1366D9] shadow-[0_0_10px_#1366D9] animate-[scanline_2.4s_ease-in-out_infinite]" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="inline-block bg-black/60 text-white text-[11px] px-3 py-1 rounded-full">Apunta al código de barras</span>
          </div>
        </div>
        {/* Resultado inventado */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#EBFFED] text-[#10A760] flex items-center justify-center">
              <span className="material-symbols-outlined text-base">check_circle</span>
            </span>
            <div className="flex-1">
              <p className="text-[10px] text-[#667085] leading-tight">Detectado · 13 unidades</p>
              <p className="text-xs font-semibold text-[#1B2430] leading-tight">Leche Entera 1L</p>
            </div>
            <span className="text-[10px] bg-[#E8F1FD] text-[#1366D9] font-semibold px-2 py-0.5 rounded-full">+2 lote</span>
          </div>
        </div>
        {/* KPI mini */}
        <div className="mt-auto mx-4 mb-4 rounded-xl border border-[#E6E8EC] p-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-[#667085]">Nivel stock</p>
            <p className="text-sm font-bold text-[#10A760]">Saludable</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#667085]">Productos contados</p>
            <p className="text-sm font-bold text-[#1366D9]">1.248</p>
          </div>
        </div>
      </div>
    </div>
  );
}
