import React, { useEffect, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";

function Donut({ datos, etiquetas, centro, colores, tam = 200, grosor = 28 }) {
  const total = datos.reduce((a, b) => a + b, 0) || 1;
  let acum = 0;
  const grad = datos
    .map((v, i) => {
      const from = (acum / total) * 100;
      acum += v;
      const to = (acum / total) * 100;
      return `${colores[i]} ${from}% ${to}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="donut-chart relative"
        style={{
          width: tam,
          height: tam,
          background: `conic-gradient(${grad})`,
        }}
      >
        <div
          className="donut-inner"
          style={{ width: tam - grosor, height: tam - grosor }}
        >
          <span className="font-metric-xl text-metric-xl text-primary">{centro}</span>
          <span className="font-label-lg text-label-lg text-on-surface-variant text-sm">unid.</span>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap justify-center mt-2">
        {datos.map((v, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[i] }}></span>
            <span className="font-body-md text-body-md text-on-surface-variant text-sm">
              {etiquetas ? etiquetas[i] : v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tarjeta({ titulo, dato, sufijo = "", color = "text-primary", borde }) {
  return (
    <div
      className={`bg-surface p-4 rounded-xl tactile-card flex flex-col justify-between gap-2 ${borde ? "border-[1.5px] border-error" : ""}`}
      style={{ minHeight: 110 }}
    >
      <span className="font-label-lg text-label-lg text-on-surface-variant">{titulo}</span>
      <span className={`font-metric-xl text-metric-xl ${color}`}>
        {dato}
        {sufijo && <span className="text-lg align-top"> {sufijo}</span>}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    fetch("/api/kpis")
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

  const fmtB = (n) => n.toLocaleString("es-VE", { minimumFractionDigits: 2 });

  const PALETA = ["#1565C0", "#1B6D24", "#B26A00", "#7B1FA2", "#C62828", "#00838F", "#5D4037", "#455A64"];
  const categoriasDonut = cat.map((c, i) => ({
    nombre: c.categoria,
    value: c.unidades,
    color: PALETA[i % PALETA.length],
  }));

  return (
    <>
      <TopBar />
      <main className="max-w-2xl mx-auto px-section-margin pt-element-gap space-y-gutter pb-[96px]">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Mis Gráficos</h2>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-gutter">
          <Tarjeta titulo="Valuación Total" dato={fmtB(tot.valor_inventario)} sufijo="Bs" />
          <Tarjeta titulo="Ítems Críticos" dato={sc.critico} color="text-error" borde />
        </div>

        {/* Donas */}
        <section className="bg-surface rounded-xl p-container-padding tactile-card space-y-gutter">
          <h3 className="font-headline-md text-headline-md text-primary">Stock por Categoría</h3>
          <Donut
            centro={tot.total_unidades}
            datos={categoriasDonut.map((c) => c.value)}
            etiquetas={categoriasDonut.map((c) => `${c.nombre}: ${c.value}`)}
            colores={categoriasDonut.map((c) => c.color)}
          />
        </section>

        <section className="bg-surface rounded-xl p-container-padding tactile-card space-y-gutter">
          <h3 className="font-headline-md text-headline-md text-primary">Estado del Stock</h3>
          <Donut
            centro={`${salud}%`}
            datos={[sc.normal, sc.bajo, sc.critico]}
            etiquetas={[`Óptimo: ${sc.normal}`, `Bajo: ${sc.bajo}`, `Crítico: ${sc.critico}`]}
            colores={["#2E7D32", "#B26A00", "#C62828"]}
          />
        </section>

        <section className="bg-surface rounded-xl p-container-padding tactile-card space-y-gutter">
          <h3 className="font-headline-md text-headline-md text-primary">Impuestos</h3>
          <Donut
            centro={total(imp)}
            datos={[imp.exento, imp.gravado, imp.sin_definir || 0]}
            etiquetas={[`Exento: ${imp.exento}`, `Gravado: ${imp.gravado}`, `Sin definir: ${imp.sin_definir || 0}`]}
            colores={["#2E7D32", "#1565C0", "#b0aaa0"]}
          />
        </section>

        <section className="bg-surface rounded-xl p-container-padding tactile-card space-y-gutter">
          <h3 className="font-headline-md text-headline-md text-primary">Próximos a Vencer</h3>
          <Donut
            centro={totalVenc(venc)}
            datos={[venc.en_3m, venc.en_6m, venc.lejanos]}
            etiquetas={[`≤ 3m: ${venc.en_3m}`, `3-6m: ${venc.en_6m}`, `Lejos/sin lote: ${venc.lejanos}`]}
            colores={["#C62828", "#B26A00", "#2E7D32"]}
          />
        </section>

        <p className="text-center text-on-surface-variant font-body-md text-body-md text-sm pt-4">
          Datos reales del maestro. Caché de 5 min.
        </p>
      </main>
      <BottomNav activo="graficos" />
    </>
  );
}

function total(o) {
  return Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}
function totalVenc(o) {
  return total(o);
}
