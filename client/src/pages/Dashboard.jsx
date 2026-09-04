import React, { useEffect, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";
import { apiFetch } from "../api.js";
import { useRutas } from "../lib/panel.jsx";

function fmtNum(n) {
  return Number(n || 0).toLocaleString("es-VE");
}

function fmtMonto(n, moneda, tasa) {
  const v = Number(n || 0);
  if (moneda === "usd") {
    return "$" + v.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const bs = v * (Number(tasa) || 1);
  return "Bs " + bs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Toggle de moneda (Bs / USD) para montos ligados a la tasa BCV.
function MonedaToggle({ moneda, setMoneda }) {
  return (
    <div className="flex rounded-lg overflow-hidden border-[1.5px] border-surface-variant">
      {["bs", "usd"].map((m) => (
        <button
          key={m}
          onClick={() => setMoneda(m)}
          className={`px-2.5 py-1 text-xs font-semibold uppercase transition-colors tactile-card ${
            moneda === m ? "bg-primary text-white" : "bg-surface text-on-surface-variant"
          }`}
        >
          {m === "bs" ? "Bs" : "$"}
        </button>
      ))}
    </div>
  );
}

// Gráfico de barras vertical (SVG)
function BarChart({ datos, colores, height = 220 }) {
  if (!datos || datos.length === 0) return <p className="text-on-surface-variant">Sin datos.</p>;
  const max = Math.max(1, ...datos.map((d) => d.value));
  const W = 640;
  const H = height;
  const padB = 40;
  const padT = 16;
  const n = datos.length;
  const slot = W / n;
  const barW = Math.min(52, slot * 0.55);
  const maxH = H - padT - padB;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de barras">
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
              <title>{`${d.label || d.name}: ${fmtNum(d.value)} unidades`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={y - 5}
              textAnchor="middle"
              fontSize="10"
              fill="#44474e"
            >
              {d.value > 0 ? fmtNum(d.value) : ""}
            </text>
            <text
              x={x + barW / 2}
              y={H - padB + 16}
              textAnchor="middle"
              fontSize="10.5"
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
  const { esPanel } = useRutas();
  const [kpis, setKpis] = useState(null);
  const [filas, setFilas] = useState([]);
  const [avance, setAvance] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoConsol, setCargandoConsol] = useState(true);
  const [moneda, setMoneda] = useState("bs");
  const [vencAbierto, setVencAbierto] = useState(false);

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

  useEffect(() => {
    let activo = true;
    apiFetch("/consolidacion")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (activo && d) {
          setFilas(d.filas || []);
          setAvance(d.avance || null);
        }
        if (activo) setCargandoConsol(false);
      })
      .catch(() => activo && setCargandoConsol(false));
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
  const venc = kpis.vencimientos;
  const tot = kpis.totales;
  const cat = kpis.stock_por_categoria || [];
  const tasa = kpis.tasa_bcv;
  const scTotal = sc.critico + sc.bajo + sc.normal;

  const PALETA = ["#005db8", "#3b82d0", "#7aa9e8", "#aac7ff", "#56688a", "#8a9ab8", "#009ED8", "#0ACF83"];
  const catOrdenadas = [...cat].sort((a, b) => b.unidades - a.unidades);
  const barrasCat = catOrdenadas.map((c) => ({
    name: c.categoria,
    short: (c.categoria || "—").slice(0, 10),
    value: c.unidades,
  }));

  const curvaVenc = [
    { label: "≤ 3 meses", short: "≤3m", value: venc.en_3m || 0 },
    { label: "3-6 meses", short: "3-6m", value: venc.en_6m || 0 },
    { label: "Lejanos", short: ">6m", value: venc.lejanos || 0 },
  ];

  return (
    <>
      <TopBar />
      <main
        className={
          "mx-auto px-section-margin pt-element-gap space-y-gutter pb-[96px] " +
          (esPanel ? "max-w-5xl" : "max-w-5xl")
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary mb-0.5">Resumen del Inventario</h2>
            <p className="font-body-md text-body-md text-sm text-on-surface-variant">
              Datos del maestro · {fmtNum(tot.total_articulos)} artículos
              {tasa ? ` · Tasa BCV: Bs ${Number(tasa).toLocaleString("es-VE", { maximumFractionDigits: 2 })}/$` : ""}
            </p>
          </div>
          {!esPanel && (
            <span className="font-body-md text-body-md text-xs bg-surface-container-low text-on-surface-variant px-3 py-1.5 rounded-full hidden sm:inline">
              Caché de 5 min
            </span>
          )}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-gutter">
          <div className="flex flex-col gap-2">
            <Tarjeta titulo="Valuación Total" dato={fmtMonto(tot.valor_inventario, moneda, tasa)} icono="payments" />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-on-surface-variant">Moneda</span>
              <MonedaToggle moneda={moneda} setMoneda={setMoneda} />
            </div>
          </div>
          <Tarjeta titulo="Unidades" dato={fmtNum(tot.total_unidades)} icono="inventory_2" />
          <Tarjeta titulo="Tomas de Inventario" dato={fmtNum(venc.total_tomas)} icono="scan" />
        </div>

        {/* Unidades por Categoría */}
        <Card titulo="Unidades por Categoría">
          <BarChart datos={barrasCat} colores={PALETA} />
          <p className="text-center text-on-surface-variant text-sm">
            Unidades en stock por categoría.
          </p>
        </Card>

        {/* Estado del Stock */}
        <Card titulo="Estado del Stock">
          <div className="space-y-3">
            <BarEstadistica etiqueta="Óptimo" valor={sc.normal} color="#005db8" total={scTotal} />
            <BarEstadistica etiqueta="Bajo" valor={sc.bajo} color="#b26a00" total={scTotal} />
            <BarEstadistica etiqueta="Crítico" valor={sc.critico} color="#ba1a1a" total={scTotal} />
          </div>
          <p className="text-center text-on-surface-variant text-sm pt-1">
            {fmtNum(scTotal)} artículos · umbrales bajo ≤ 25 y crítico ≤ 10 unidades
          </p>
        </Card>

        {/* Próximos a Vencer (click → detalle) */}
        <Card
          titulo="Próximos a Vencer (por cantidad)"
          action={
            <button
              onClick={() => setVencAbierto(true)}
              className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline"
            >
              Ver detalle <span className="material-symbols-outlined text-base">open_in_new</span>
            </button>
          }
        >
          <AreaChart puntos={curvaVenc} color="#b26a00" fill="rgba(178,106,0,0.14)" />
          <p className="text-center text-on-surface-variant text-sm">
            Haz clic en "Ver detalle" para listar los productos que vencen.
          </p>
        </Card>

        {/* Consolidación: avance de conteo (dona) */}
        <Card titulo="Avance de Conteo">
          {cargandoConsol ? (
            <p className="text-on-surface-variant text-center py-4">Cargando…</p>
          ) : !avance ? (
            <p className="text-on-surface-variant text-center py-4">Sin datos de avance.</p>
          ) : (
            <AvanceContado avance={avance} />
          )}
        </Card>

        {/* Estatus (barras %) */}
        <Card titulo="Estatus del Conteo">
          {cargandoConsol ? (
            <p className="text-on-surface-variant text-center py-4">Cargando…</p>
          ) : filas.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">Sin datos de estatus.</p>
          ) : (
            <EstatusBarras filas={filas} />
          )}
        </Card>

        {/* Top discrepancias por impacto financiero */}
        <Card titulo="Top Discrepancias (Impacto Financiero)">
          {cargandoConsol ? (
            <p className="text-on-surface-variant text-center py-4">Cargando…</p>
          ) : filas.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">Sin discrepancias.</p>
          ) : (
            <TopDiscrepancias filas={filas} moneda={moneda} tasa={tasa} />
          )}
        </Card>

        {/* Consolidación: tabla completa */}
        <Card titulo="Consolidación de Tomas vs Maestro">
          {cargandoConsol ? (
            <p className="text-on-surface-variant text-center py-4">Cargando consolidación…</p>
          ) : filas.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">Sin datos de consolidación.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-center justify-end pb-2">
                <MonedaToggle moneda={moneda} setMoneda={setMoneda} />
              </div>
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-surface-variant text-left text-on-surface-variant font-body-md">
                    <th className="pb-2 px-2">Artículo</th>
                    <th className="pb-2 px-2">Cód. Barra</th>
                    <th className="pb-2 px-2">Lotes</th>
                    <th className="pb-2 px-2 text-right">Total Contado</th>
                    <th className="pb-2 px-2 text-right">Stock</th>
                    <th className="pb-2 px-2 text-right">Diferencia</th>
                    <th className="pb-2 px-2">Estatus</th>
                    <th className="pb-2 px-2 text-right">Impacto ({moneda === "usd" ? "$" : "Bs"})</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((c, i) => (
                    <tr key={i} className="border-b border-surface-variant/50 hover:bg-surface-container-lowest/50">
                      <td className="py-2 px-2 font-body-md text-on-surface max-w-[200px] truncate" title={c.descripcion}>
                        {c.descripcion}
                      </td>
                      <td className="py-2 px-2 font-body-md text-on-surface-variant">{c.codigo_barra || "—"}</td>
                      <td className="py-2 px-2 font-body-md text-on-surface-variant text-center">{c.conteo_lotes}</td>
                      <td className="py-2 px-2 font-body-md text-on-surface text-right">{fmtNum(c.conteo_fecha_vencimiento)}</td>
                      <td className="py-2 px-2 font-body-md text-on-surface-variant text-right">{fmtNum(c.stock)}</td>
                      <td className="py-2 px-2 font-body-md text-right" style={{ color: Number(c.diferencia) > 0 ? "#005db8" : Number(c.diferencia) < 0 ? "#ba1a1a" : "#333" }}>
                        {Number(c.diferencia) > 0 ? "+" : ""}{fmtNum(c.diferencia)}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.estatus === "sobrante" ? "bg-blue-100 text-blue-800" :
                          c.estatus === "faltante" ? "bg-red-100 text-red-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {c.estatus === "sobrante" && <span className="material-symbols-outlined text-[11px]">arrow_upward</span>}
                          {c.estatus === "faltante" && <span className="material-symbols-outlined text-[11px]">arrow_downward</span>}
                          {c.estatus === "completo" && <span className="material-symbols-outlined text-[11px]">check_circle</span>}
                          {c.estatus.charAt(0).toUpperCase() + c.estatus.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-body-md text-on-surface text-right">
                        {fmtMonto(c.impacto_financiero, moneda, tasa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
      <BottomNav activo="graficos" />

      {vencAbierto && (
        <ModalVencimientos onClose={() => setVencAbierto(false)} />
      )}
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

// Modal de detalle de vencimientos con tabs <3m / 3-6m / >6m
function ModalVencimientos({ onClose }) {
  const [tab, setTab] = useState("en_3m");
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let activo = true;
    apiFetch("/vencimientos-detail")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => activo && setDatos(d))
      .catch(() => activo && setDatos(null));
    return () => {
      activo = false;
    };
  }, []);

  const tabs = [
    { k: "en_3m", label: "< 3 meses" },
    { k: "en_6m", label: "3-6 meses" },
    { k: "lejanos", label: "> 6 meses" },
  ];

  const listado = datos ? (datos[tab] || []) : [];

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-variant">
          <h3 className="font-headline-md text-headline-md text-primary">Próximos a Vencer</h3>
          <button onClick={onClose} className="text-on-surface-variant p-1" aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-4 pb-2">
          {tabs.map((t) => {
            const n = datos ? (datos[t.k] || []).length : 0;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold tactile-card ${
                  tab === t.k ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {t.label} · {fmtNum(n)}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-2">
          {!datos ? (
            <p className="text-on-surface-variant text-center py-6">Cargando detalle…</p>
          ) : listado.length === 0 ? (
            <p className="text-on-surface-variant text-center py-6">Sin productos en este rango.</p>
          ) : (
            <div className="space-y-2">
              {listado.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3 border-[1.5px] border-surface-variant rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-label-lg text-label-lg text-sm truncate">{a.descripcion}</p>
                    <p className="text-on-surface-variant text-xs">
                      Cód. {a.codigo_articulo} · stock {fmtNum(a.stock)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-metric-lg text-metric-lg text-primary">{fmtNum(a.cantidad)}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">unidades</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dona de Avance de Conteo: % contados vs % con stock
function AvanceContado({ avance }) {
  const conStock = Number(avance.con_stock) || 0;
  const contados = Number(avance.contados) || 0;
  const total = conStock || 1;
  const pctContados = Math.round((contados / total) * 100);
  const pctFalta = Math.max(0, 100 - pctContados);
  const grosor = 26;
  const tam = 176;

  const segs = [
    `#005db8 ${0}% ${pctContados}%`,
    `#e0e0e6 ${pctContados}% ${pctContados + pctFalta}%`,
  ].join(", ");

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="donut-chart"
        style={{ width: tam, height: tam, background: `conic-gradient(${segs})` }}
      >
        <div className="donut-inner" style={{ width: tam - grosor, height: tam - grosor }}>
          <span className="font-metric-xl text-metric-xl text-primary">{pctContados}%</span>
          <span className="font-label-lg text-label-lg text-on-surface-variant text-sm">contados</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <span className="flex items-center gap-1.5 text-sm font-body-md text-on-surface-variant">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#005db8" }} />
          Contados: {fmtNum(contados)} ({pctContados}%)
        </span>
        <span className="flex items-center gap-1.5 text-sm font-body-md text-on-surface-variant">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#e0e0e6" }} />
          Pendientes: {fmtNum(conStock - contados)} ({pctFalta}%)
        </span>
      </div>
      <p className="text-center text-on-surface-variant text-sm">
        Artículos con stock en el maestro: {fmtNum(conStock)} · ya contados: {fmtNum(contados)}
      </p>
    </div>
  );
}

// Barras horizontales: % de cada estatus (completos, faltante, sobrante)
function EstatusBarras({ filas }) {
  const tot = filas.length;
  const cuenta = (et) => filas.filter((f) => f.estatus === et).length;
  const completo = cuenta("completo");
  const faltante = cuenta("faltante");
  const sobrante = cuenta("sobrante");
  const pct = (n) => (tot ? Math.round((n / tot) * 100) : 0);

  const filas2 = [
    { n: "Completos", v: completo, c: "#10a760" },
    { n: "Faltante", v: faltante, c: "#da3e33" },
    { n: "Sobrante", v: sobrante, c: "#005db8" },
  ];

  return (
    <div className="space-y-3">
      {filas2.map((r) => (
        <div key={r.n}>
          <div className="flex justify-between items-center mb-1">
            <span className="font-body-md text-body-md text-sm text-on-surface">{r.n}</span>
            <span className="font-body-md text-body-md text-sm text-on-surface-variant">
              {fmtNum(r.v)} · {pct(r.v)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct(r.v)}%`, backgroundColor: r.c }}
            />
          </div>
        </div>
      ))}
      <p className="text-center text-on-surface-variant text-sm pt-1">Total artículos contados: {fmtNum(tot)}</p>
    </div>
  );
}

// Top discrepancias por impacto financiero (top 5/10/15), monto en Bs/$
function TopDiscrepancias({ filas, moneda, tasa }) {
  const [top, setTop] = useState(10);

  const ordenadas = [...filas].sort(
    (a, b) => Math.abs(Number(b.impacto_financiero) || 0) - Math.abs(Number(a.impacto_financiero) || 0)
  );
  const topFilas = ordenadas.slice(0, top);
  const max = Math.max(1, ...topFilas.map((f) => Math.abs(Number(f.impacto_financiero) || 0)));

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-end">
        {[5, 10, 15].map((n) => (
          <button
            key={n}
            onClick={() => setTop(n)}
            className={`px-3 py-1 rounded-full text-xs font-semibold tactile-card ${
              top === n ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            Top {n}
          </button>
        ))}
      </div>
      <div className="space-y-2.5">
        {topFilas.map((f, i) => {
          const val = Number(f.impacto_financiero) || 0;
          const v = Math.abs(val);
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-bold text-on-surface-variant w-5 text-right">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5 gap-2">
                  <span className="font-body-md text-body-md text-sm text-on-surface truncate" title={f.descripcion}>
                    {f.descripcion}
                  </span>
                  <span className="font-body-md text-body-md text-sm whitespace-nowrap" style={{ color: val > 0 ? "#005db8" : val < 0 ? "#da3e33" : "#333" }}>
                    {fmtMonto(val, moneda, tasa)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(v / max) * 100}%`, backgroundColor: val > 0 ? "#005db8" : "#da3e33" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}