import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";

const Hero3D = lazy(() => import("../components/Hero3D.jsx"));

function Material({ name, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

function fmtNum(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("es-VE");
}

// Mini teléfono que simula la app real (Inicio con escáner + primer KPI)
function PhoneMock({ kpis }) {
  const stockCritico = kpis?.stock_critico?.critico ?? 0;
  const totalUnidades = kpis?.totales?.total_unidades ?? 0;
  const totalArt = kpis?.totales?.total_articulos ?? 0;
  const chispa = totalUnidades ? Math.round((stockCritico / totalUnidades) * 1000) / 10 : "—";

  return (
    <div className="relative w-[280px] h-[560px] bg-[#0f1115] rounded-[2.6rem] p-[10px] shadow-[0_24px_48px_rgba(16,24,40,0.28)]">
      <div className="relative w-full h-full bg-surface rounded-[2.1rem] overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#0f1115] rounded-b-2xl z-20" />
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-8 pb-2 text-on-surface-variant">
          <span className="font-body-md text-body-md text-xs">09:41</span>
          <span className="flex items-center gap-1 text-xs" aria-hidden>
            <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
            <span className="material-symbols-outlined text-sm">wifi</span>
            <span className="material-symbols-outlined text-sm">battery_full</span>
          </span>
        </div>
        {/* TopBar */}
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Material name="fact_check" className="text-primary text-lg" />
          </span>
          <span className="font-headline-md text-headline-md text-lg text-primary font-semibold">Tu Auditor</span>
        </div>
        {/* Scanner area */}
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden relative flex-1 bg-surface-container-low">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#eef3fb,#f4f3f7)]" />
          <div className="absolute inset-0 bg-black/40" />
          {/* Esquinas escáner */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[42%]">
            <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#aac7ff] rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#aac7ff] rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#aac7ff] rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#aac7ff] rounded-br-lg" />
            <span className="absolute left-0 right-0 h-[2px] bg-[#aac7ff] shadow-[0_0_10px_#aac7ff] animate-[scanline_2.4s_ease-in-out_infinite]" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="inline-block bg-black/60 text-white text-xs px-3 py-1 rounded-full font-body-md">
              Apunta al código de barras
            </span>
          </div>
        </div>
        {/* KPI chip */}
        <div className="px-4 py-3 flex justify-between items-center bg-surface">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center">
              <Material name="inventory_2" className="text-error text-base" />
            </span>
            <div>
              <p className="font-body-md text-xs text-on-surface-variant leading-tight">Productos auditados</p>
              <p className="font-metric-lg text-metric-lg text-sm font-bold text-on-surface leading-tight">
                {fmtNum(totalArt)} ítems
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-body-md text-xs text-on-surface-variant leading-tight">Stock en sistema</p>
            <p className="font-metric-lg text-metric-lg text-sm font-bold text-primary leading-tight">
              {fmtNum(totalUnidades)} unid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Previsualización del dashboard con datos reales
function DashboardPreview({ kpis }) {
  const cat = kpis?.stock_por_categoria || [];
  const totalCat = cat.reduce((a, c) => a + (Number(c.unidades) || 0), 0) || 1;
  const maxCat = Math.max(1, ...cat.map((c) => Number(c.unidades) || 0));
  const barras = cat.slice(0, 6).map((c) => ({
    nombre: c.categoria,
    valor: Number(c.unidades) || 0,
    pct: Math.round(((Number(c.unidades) || 0) / maxCat) * 100),
    share: Math.round(((Number(c.unidades) || 0) / totalCat) * 100),
  }));

  const valor = kpis?.totales?.valor_inventario ?? null;
  const sc = kpis?.stock_critico ?? null;
  const imp = kpis?.impuestos ?? null;
  const salud = sc && sc.critico + sc.bajo + sc.normal > 0
    ? Math.round((sc.normal / (sc.critico + sc.bajo + sc.normal)) * 100)
    : null;

  const PALETA = ["#005db8", "#3b82d0", "#7aa9e8", "#aac7ff", "#d6e3ff", "#56688a"];

  return (
    <div className="w-full bg-surface rounded-2xl border border-surface-variant shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-surface-variant">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Material name="query_stats" className="text-primary text-lg" />
          </span>
          <span className="font-headline-md text-headline-md text-lg text-on-surface">Panel de Control</span>
        </div>
        <span className="text-xs font-body-md text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
          Maestro · {fmtNum(kpis?.totales?.total_articulos ?? 0)} artículos
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5">
        <MiniKPI
          icono="payments"
          color={sc ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"}
          titulo="Valuación"
          valor={valor != null ? `Bs ${fmtNum(Math.round(valor))}` : "—"}
        />
        <MiniKPI
          icono="inventory_2"
          color="bg-secondary-fixed text-on-secondary-fixed"
          titulo="Ítems auditados"
          valor={fmtNum(kpis?.totales?.total_articulos ?? "—")}
        />
        <MiniKPI
          icono="check_circle"
          color={sc ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary/10 text-primary"}
          titulo="Salud del stock"
          valor={sc ? `${salud}%` : "—"}
        />
        <MiniKPI
          icono="warning"
          color={sc ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}
          titulo="Ítems críticos"
          valor={fmtNum(sc ? sc.critico : "—")}
        />
      </div>

      {/* Bar chart */}
      <div className="px-5 pb-5">
        <p className="font-label-lg text-label-lg text-sm text-on-surface mb-3">Unidades por categoría</p>
        <div className="flex items-end gap-4 h-40">
          {barras.map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <span className="text-xs font-body-md text-on-surface-variant">{b.share}%</span>
              <div className="w-full flex flex-col justify-end rounded-md overflow-hidden" style={{ height: 132 }}>
                <div
                  className="w-full rounded-t-md"
                  style={{ height: `${b.pct}%`, backgroundColor: PALETA[i % PALETA.length] }}
                />
              </div>
              <span className="text-[10px] font-body-md text-on-surface-variant truncate w-full text-center">
                {b.nombre}
              </span>
            </div>
          ))}
        </div>
        {imp && (
          <div className="flex items-center gap-4 mt-4 text-xs font-body-md text-on-surface-variant flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#005db8]" /> Exento: {fmtNum(imp.exento)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7aa9e8]" /> Gravado: {fmtNum(imp.gravado)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d6e3ff]" /> Sin definir: {fmtNum(imp.sin_definir)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniKPI({ icono, color, titulo, valor }) {
  return (
    <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-3 flex flex-col gap-2">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Material name={icono} className="text-lg" />
      </span>
      <span className="font-body-md text-xs text-on-surface-variant leading-tight">{titulo}</span>
      <span className="font-metric-lg text-metric-lg text-lg font-bold text-on-surface leading-tight">{valor}</span>
    </div>
  );
}

export default function Landing() {
  const [kpis, setKpis] = useState(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    apiFetch("/kpis")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setKpis(d))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden pb-[76px] md:pb-0">
      {/* TopAppBar (desktop only) */}
      <header className="w-full top-0 sticky bg-surface border-b border-surface-variant z-50 hidden md:block">
        <div className="flex justify-between items-center h-[64px] px-container-padding w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Material name="fact_check" className="text-primary text-xl" />
            </span>
            <span className="font-headline-md text-headline-md text-primary uppercase tracking-tight">
              Tu Auditor
            </span>
          </div>
          <nav className="flex items-center gap-6 font-body-md text-body-md text-on-surface-variant">
            <a href="#beneficios" className="hover:text-primary transition-colors">Beneficios</a>
            <a href="#como-funciona" className="hover:text-primary transition-colors">Cómo funciona</a>
            <span className="text-on-surface-variant">Datos reales</span>
          </nav>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto">
        {/* 1. HERO */}
        <section className="relative overflow-hidden px-section-margin pt-10 pb-14 md:py-20">
          {/* Fondo 3D a pantalla ancha */}
          <div className="absolute inset-0 -z-0 pointer-events-none" aria-hidden>
            <Suspense fallback={null}>
              <Hero3D className="w-full h-full" transparent />
            </Suspense>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
            <div className="w-full lg:w-1/2 flex flex-col gap-5 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 self-center lg:self-start bg-primary/10 text-primary font-button-text text-button-text text-sm px-3 py-1.5 rounded-full w-fit">
                <Material name="bolt" className="text-base" />
                Inventario rápido, decisiones seguras
              </span>
              <h1 className="font-display-lg text-display-lg text-on-surface leading-[1.1] tracking-tight">
                Escanea.
                <br />
                Cuenta.
                <br />
                <span className="text-primary">Decide.</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto lg:mx-0">
                Control de inventario diseñado para equipos que necesitan precisión:
                escaneo continuo, tomas por lote y vencimientos, y paneles que te dicen
                exactamente qué reponer.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-2">
                <Link
                  to="/inicio"
                  className="tactile-button bg-primary text-on-primary font-button-text text-button-text h-[56px] px-8 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Material name="barcode_scanner" />
                  Comenzar Prueba
                </Link>
                <Link
                  to="/graficos"
                  className="bg-surface text-primary border-2 border-primary font-button-text text-button-text h-[56px] px-8 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto hover:bg-primary/5 transition-colors"
                >
                  Ver Demo
                </Link>
              </div>
            </div>

            <div className="w-full lg:w-1/2 relative flex justify-center items-center">
              <div className="relative">
                <div className="absolute -inset-6 bg-surface/60 rounded-[3rem] blur-3xl" aria-hidden />
                <PhoneMock kpis={kpis} />
              </div>
            </div>
          </div>
        </section>

        {/* 2. BENEFICIOS */}
        <section id="beneficios" className="px-section-margin py-16 bg-surface-container-low">
          <div className="text-center mb-12">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">
              Hecho para el conteo real
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
              Del escáner al gráfico sin intermediarios: cada unidad que cuentas
              queda registrada contra el lote y la referencia correctos.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Beneficio
              icono="timer"
              iconoBg="bg-primary/10"
              iconoColor="text-primary"
              titulo="Ahorro de Tiempo"
              texto="Auditorías hasta 3x más rápidas gracias al escaneo continuo sin interrupciones."
            />
            <Beneficio
              icono="shield"
              iconoBg="bg-secondary-fixed"
              iconoColor="text-on-secondary-fixed"
              titulo="Trazabilidad total"
              texto="Cada producto queda ligado a su lote y fecha de vencimiento."
            />
            <Beneficio
              icono="insights"
              iconoBg="bg-tertiary-fixed"
              iconoColor="text-on-tertiary-fixed"
              titulo="Decisión por datos"
              texto="Identifica stock crítico y evita quiebres antes de que ocurran."
            />
          </div>
        </section>

        {/* 3. CÓMO FUNCIONA */}
        <section id="como-funciona" className="px-section-margin py-16">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-12 text-center">
            Flujo de Trabajo Simplificado
          </h2>
          <div className="flex flex-col md:flex-row gap-8 items-start relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-1 bg-surface-variant -z-10" />
            <Paso numero="1" titulo="Escanea" texto="Captura el código del producto con la cámara del teléfono." />
            <Paso numero="2" titulo="Verifica" texto="Lote, vencimiento, ubica actual y diferencias contra el sistema." />
            <Paso numero="3" titulo="Decide" texto="Los gráficos señalan qué reponer y qué está en riesgo." />
          </div>
        </section>

        {/* 4. PREVIEW DASHBOARD */}
        <section className="px-section-margin py-16 bg-gradient-to-b from-primary to-primary-fixed-dim rounded-t-[2rem]">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className="font-headline-lg text-headline-lg text-on-primary-fixed mb-3">
              Visibilidad Total del Inventario
            </h2>
            <p className="font-body-md text-body-md text-on-primary-fixed max-w-2xl mx-auto">
              Panel de control con datos del maestro real: categorías, salud del stock,
              impuestos y vencimientos al alcance.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <DashboardPreview kpis={kpis} />
          </div>
        </section>

        {/* 5. CTA FORM */}
        <section className="px-section-margin py-20 bg-surface">
          <div className="max-w-xl mx-auto tactile-card bg-surface-container-lowest p-8 rounded-2xl">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2 text-center">
              Solicitar Demostración
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-8 text-center">
              Un especialista se pondrá en contacto para evaluar tu operación.
            </p>
            <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
              <CampoForm label="Nombre Completo" id="name" placeholder="Ej. Carlos Pérez" type="text" />
              <CampoForm label="Correo Electrónico" id="email" placeholder="contacto@empresa.com" type="email" />
              <CampoForm label="Teléfono" id="phone" placeholder="+58 000 000 0000" type="tel" />
              <button className="tactile-button mt-2 bg-primary text-on-primary font-button-text text-button-text h-[56px] rounded-xl w-full" type="submit">
                Enviar Solicitud
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function Beneficio({ icono, iconoBg, iconoColor, titulo, texto }) {
  return (
    <div className="tactile-card bg-surface p-8 rounded-xl flex flex-col items-center text-center hover:shadow-card-hover">
      <div className={`w-14 h-14 ${iconoBg} rounded-2xl flex items-center justify-center mb-5`}>
        <Material name={icono} className={`${iconoColor} text-2xl`} />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{titulo}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{texto}</p>
    </div>
  );
}

function Paso({ numero, titulo, texto }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center relative z-10 w-full">
      <div className="w-20 h-20 bg-surface tactile-card rounded-2xl flex items-center justify-center mb-5 border-2 border-primary/20 shadow-card">
        <span className="font-metric-xl text-metric-xl text-primary">{numero}</span>
      </div>
      <h4 className="font-label-lg text-label-lg text-on-surface mb-1.5">{titulo}</h4>
      <p className="font-body-md text-body-md text-on-surface-variant text-[15px]">{texto}</p>
    </div>
  );
}

function CampoForm({ label, id, placeholder, type }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-lg text-label-lg text-on-surface" htmlFor={id}>
        {label}
      </label>
      <input
        className="h-[56px] bg-surface-container-lowest border border-outline rounded-xl px-4 font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        id={id}
        type={type}
        placeholder={placeholder}
      />
    </div>
  );
}