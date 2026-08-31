import React, { useEffect, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";
import { apiFetch } from "../api.js";

function fmtNum(n) {
  return Number(n || 0).toLocaleString("es-VE");
}

function Tarjeta({ titulo, dato, sufijo = "", color = "text-primary", icono, borde }) {
  return (
    <div
      className={`bg-surface p-4 rounded-xl tactile-card flex flex-col justify-between gap-2 ${borde ? "border-[1.5px] border-error" : ""}`}
      style={{ minHeight: 116 }}
    >
      <div className="flex items-center gap-2">
        {icono && (
          <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className={`material-symbols-outlined text-lg ${color}`}>{icono}</span>
          </span>
        )}
        <span className="font-label-lg text-label-lg text-sm text-on-surface-variant">{titulo}</span>
      </div>
      <span className={`font-metric-xl text-metric-xl ${color}`}>
        {dato}
        {sufijo && <span className="text-lg align-top"> {sufijo}</span>}
      </span>
    </div>
  );
}

function Card({ titulo, children, action }) {
  return (
    <section className="bg-surface rounded-xl p-container-padding tactile-card space-y-gutter">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-md text-headline-md text-primary">{titulo}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// Gráfico de barras vertical (SVG)
function BarChart({ datos, colores, height = 220 }) {
  if (!datos || datos.length === 0) return <p className="text-on-surface-variant">Sin datos.</p>;
  const max = Math.max(1, ...datos.map((d) => d.value));
  const W = 640;
  const H = height;
  const padB = 34;
  const padT = 16;
  const n = datos.length;
  const slot = W / n;
  const barW = Math.min(52, slot * 0.55);
  const maxH = H - padT - padB;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de barras">
      {/* gridlines */}
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line
            x1={0}
            x2={W}
            y1={H - padB - maxH * g}
            y2={H - padB - maxH * g}
            stroke="#e3e2e6"
            strokeWidth="1"
          />
        </g>
      ))}
      {datos.map((d, i) => {
        const h = (d.value / max) * maxH;
        const x = i * slot + (slot - barW) / 2;
        const y = H - padB - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={6}
              fill={colores[i % colores.length]}
            >
              <title>{`${d.label || d.name}: ${fmtNum(d.value)}`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={H - padB + 16}
              textAnchor="middle"
              fontSize="11"
              fill="#44474e"
            >
              {d.short || d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Gráfico de área (SVG)
function AreaChart({ puntos, height = 180, color = "#005db8", fill = "rgba(0,93,184,0.14)" }) {
  if (!puntos || puntos.length === 0) return <p className="text-on-surface-variant">Sin datos.</p>;
  const W = 640;
  const H = height;
  const pad = 24;
  const max = Math.max(1, ...puntos.map((p) => p.value));
  const n = puntos.length;
  const step = (W - pad * 2) / (n - 1);
  const xAt = (i) => pad + i * step;
  const yAt = (v) => H - pad - (v / max) * (H - pad * 2);

  let line = "";
  puntos.forEach((p, i) => {
    line += `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)} `;
  });
  const area = `${line}L ${xAt(n - 1).toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de área">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(p.value)} r="4.5" fill="#ffffff" stroke={color} strokeWidth="2.5">
          <title>{`${p.label || ""}: ${fmtNum(p.value)}`}</title>
        </circle>
      ))}
      {puntos.map((p, i) => (
        <text
          key={`l${i}`}
          x={xAt(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize="11"
          fill="#44474e"
        >
          {p.short || p.label}
        </text>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    apiFetch("/kpis")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (activo && d) setKpis(d);
        if (activo) setCargando(false);
      })
      .catch(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  if (cargando)
    return (
      <>
        <TopBar />
        <main className="p-container-padding">Cargando gráficos…</main>
        <BottomNav activo="graficos" />
      </>
    );

  if (!kpis)
    return (
      <>
        <TopBar />
        <main className="p-container-padding text-error">No se pudieron cargar los gráficos.</main>
        <BottomNav activo="graficos" />
      </>
    );

  const sc = kpis.stock_critico;
  const imp = kpis.impuestos;
  const venc = kpis.vencimientos;
  const tot = kpis.totales;
  const cat = kpis.stock_por_categoria || [];
  const scTotal = sc.critico + sc.bajo + sc.normal;
  const salud = scTotal ? Math.round((sc.normal / scTotal) * 100) : 0;

  const fmtB = (n) => "Bs " + Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 });

  const PALETA = ["#005db8", "#3b82d0", "#7aa9e8", "#aac7ff", "#56688a", "#8a9ab8"];
  const catOrdenadas = [...cat].sort((a, b) => b.unidades - a.unidades);
  const barrasCat = catOrdenadas.map((c) => ({
    name: c.categoria,
    short: (c.categoria || "—").slice(0, 10),
    value: c.unidades,
  }));

  // Curva de vencimientos: acumulado hacia el horizonte (en_3m, 3-6m, lejanos)
  const curvaVenc = [
    { label: "≤ 3 meses", short: "≤3m", value: venc.en_3m || 0 },
    { label: "3-6 meses", short: "3-6m", value: venc.en_6m || 0 },
    { label: "Lejanos", short: ">6m", value: venc.lejanos || 0 },
  ];

  const impTot = (imp.exento || 0) + (imp.gravado || 0) + (imp.sin_definir || 0);
  const donutImp = impTot > 0;

  return (
    <>
      <TopBar />
      <main className="max-w-5xl mx-auto px-section-margin pt-element-gap space-y-gutter pb-[96px]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary mb-0.5">Resumen del Inventario</h2>
            <p className="font-body-md text-body-md text-sm text-on-surface-variant">
              Datos del maestro · {fmtNum(tot.total_articulos)} artículos
            </p>
          </div>
          <span className="font-body-md text-body-md text-xs bg-surface-container-low text-on-surface-variant px-3 py-1.5 rounded-full hidden sm:inline">
            Caché de 5 min
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
          <Tarjeta titulo="Valuación Total" dato={fmtB(tot.valor_inventario)} icono="payments" />
          <Tarjeta titulo="Unidades" dato={fmtNum(tot.total_unidades)} icono="inventory_2" />
          <Tarjeta titulo="Salud del Stock" dato={`${salud}%`} icono="monitoring" />
          <Tarjeta titulo="Ítems Críticos" dato={fmtNum(sc.critico)} icono="warning" color="text-error" borde />
        </div>

        {/* Bar chart categorías */}
        <Card titulo="Unidades por Categoría">
          <BarChart datos={barrasCat} colores={PALETA} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {/* Estado del stock */}
          <Card titulo="Estado del Stock">
            <div className="space-y-3">
              <BarEstadistica
                etiqueta="Óptimo"
                valor={sc.normal}
                color="#005db8"
                total={scTotal}
              />
              <BarEstadistica
                etiqueta="Bajo"
                valor={sc.bajo}
                color="#b26a00"
                total={scTotal}
              />
              <BarEstadistica
                etiqueta="Crítico"
                valor={sc.critico}
                color="#ba1a1a"
                total={scTotal}
              />
            </div>
          </Card>

          {/* Impuestos */}
          <Card titulo="Impuestos">
            {donutImp ? (
              <ImpuestosBlock imp={imp} impTot={impTot} />
            ) : (
              <p className="text-on-surface-variant">Sin datos de impuestos.</p>
            )}
          </Card>
        </div>

        {/* área vencimientos */}
        <Card titulo="Próximos a Vencer (por cantidad)">
          <AreaChart puntos={curvaVenc} color="#b26a00" fill="rgba(178,106,0,0.14)" />
        </Card>

        <p className="text-center text-on-surface-variant font-body-md text-body-md text-sm pt-2">
          Datos reales del maestro. Los lotes sin fecha se cuentan como lejanos.
        </p>
      </main>
      <BottomNav activo="graficos" />
    </>
  );
}

function BarEstadistica({ etiqueta, valor, color, total }) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-body-md text-body-md text-sm text-on-surface">{etiqueta}</span>
        <span className="font-body-md text-body-md text-sm text-on-surface-variant">
          {fmtNum(valor)} · {pct}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ImpuestosBlock({ imp, impTot }) {
  const cols = [
    { n: "Exento", v: imp.exento || 0, c: "#005db8" },
    { n: "Gravado", v: imp.gravado || 0, c: "#b26a00" },
    { n: "Sin definir", v: imp.sin_definir || 0, c: "#dad9dd" },
  ];
  return (
    <div className="flex flex-col items-center gap-4">
      <DonutConSegments cols={cols} impTot={impTot} />
      <div className="flex flex-wrap justify-center gap-4">
        {cols.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 text-sm font-body-md text-on-surface-variant">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.c }} />
            {c.n}: {fmtNum(c.v)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DonutConSegments({ cols, impTot }) {
  const grosor = 26;
  const tam = 168;
  let acum = 0;
  const grad = cols
    .map((c) => {
      const from = (acum / impTot) * 100;
      acum += c.v;
      const to = (acum / impTot) * 100;
      return `${c.c} ${from}% ${to}%`;
    })
    .join(", ");

  return (
    <div
      className="donut-chart"
      style={{ width: tam, height: tam, background: `conic-gradient(${grad})` }}
    >
      <div className="donut-inner" style={{ width: tam - grosor, height: tam - grosor }}>
        <span className="font-metric-xl text-metric-xl text-primary">{fmtNum(impTot)}</span>
        <span className="font-label-lg text-label-lg text-on-surface-variant text-sm">artículos</span>
      </div>
    </div>
  );
}