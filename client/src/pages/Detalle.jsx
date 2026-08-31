import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";
import { apiFetch } from "../api.js";

function estadoStock(stock) {
  if (stock <= 10)
    return {
      texto: "CRÍTICO",
      chip: "bg-error-container border-[1.5px] border-error text-on-error-container",
      icono: "warning",
    };
  if (stock <= 25)
    return {
      texto: "BAJO",
      chip: "bg-[#fff3e0] border-[1.5px] border-[#b26a00] text-[#7c4a00]",
      icono: "error",
    };
  return {
    texto: "NORMAL",
    chip: "bg-secondary-fixed border-[1.5px] border-secondary text-on-secondary-fixed",
    icono: "check_circle",
  };
}

export default function Detalle() {
  const { term } = useParams();
  const navigate = useNavigate();
  const [articulo, setArticulo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [conteo, setConteo] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");
    apiFetch(`/articulo/${encodeURIComponent(term)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("no_encontrado");
        return res.json();
      })
      .then((data) => {
        if (activo) {
          setArticulo(data);
          setConteo(data.total_contado ?? 0);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (activo) {
          setError(e.message);
          setCargando(false);
        }
      });
    return () => {
      activo = false;
    };
  }, [term]);

  if (cargando) {
    return (
      <>
        <TopBar />
        <div className="p-container-padding">
          <h1 className="font-headline-lg text-headline-lg">Buscando…</h1>
          <p className="text-on-surface-variant">Consultando el inventario.</p>
        </div>
        <BottomNav activo="escanear" />
      </>
    );
  }

  if (error || !articulo) {
    return (
      <>
        <TopBar />
        <div className="p-container-padding">
          <h1 className="font-headline-lg text-headline-lg">Producto no encontrado</h1>
          <div className="p-4 rounded-lg border-[1.5px] border-error bg-error-container text-on-error-container">
            No encontramos un producto con el código <strong>{term}</strong>.
          </div>
          <button
            className="mt-6 w-full bg-primary text-on-primary font-button-text text-button-text h-[56px] rounded-lg"
            onClick={() => navigate("/escanear")}
          >
            Volver a escanear
          </button>
        </div>
        <BottomNav activo="escanear" />
      </>
    );
  }

  const est = estadoStock(articulo.stock);
  const hayLotes = articulo.lotes && articulo.lotes.length > 0;
  const precio = articulo.precio_vigente ? `Bs ${articulo.precio_vigente.toFixed(2)}` : "—";

  return (
    <>
      <TopBar />
      <main className="max-w-2xl mx-auto px-section-margin pt-element-gap space-y-gutter pb-[96px]">
        {/* Product header card */}
        <section className="bg-surface rounded-xl p-container-padding tactile-card flex flex-col gap-element-gap">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="font-label-lg text-label-lg text-outline uppercase tracking-wider text-sm">
                {articulo.codigo_barras}
              </span>
              <div className={`px-3 py-1 rounded-full flex items-center gap-2 shadow-[0px_1px_2px_rgba(0,0,0,0.1)] ${est.chip}`}>
                <span className="material-symbols-outlined text-sm">{est.icono}</span>
                <span className="font-label-lg text-label-lg text-sm">{est.texto}</span>
              </div>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-1">{articulo.descripcion}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {articulo.categoria} · {articulo.marcas || "S/M"}
            </p>
          </div>
          <div className="mt-4 border-t-1.5 border-surface-variant pt-4 flex justify-between items-end">
            <div>
              <span className="font-label-lg text-label-lg text-outline block mb-1">Precio Actual</span>
              <span className="font-display-lg text-display-lg text-on-surface">{precio}</span>
            </div>
            {articulo.gravado !== null && (
              <span className="font-label-lg text-label-lg text-on-surface-variant">
                {articulo.gravado ? "Gravado" : "Exento"}
              </span>
            )}
          </div>
        </section>

        {/* Metrics card */}
        <section className="bg-surface rounded-xl p-container-padding tactile-card grid grid-cols-2 gap-element-gap">
          <div className="flex flex-col items-center justify-center p-4 bg-surface-container-low rounded-lg border-[1.5px] border-surface-variant">
            <span className="font-label-lg text-label-lg text-outline mb-2 text-center">Stock Sistema</span>
            <span className="font-metric-xl text-metric-xl text-on-surface">{articulo.stock}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-surface-container-low rounded-lg border-[1.5px] border-primary shadow-[inset_0px_2px_4px_rgba(0,0,0,0.05)]">
            <span className="font-label-lg text-label-lg text-primary mb-2 text-center">Conteo Físico</span>
            <div className="flex items-center justify-center gap-3">
              <button
                className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center active:scale-95"
                onClick={() => setConteo(Math.max(0, conteo - 1))}
                aria-label="Restar"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="font-metric-xl text-metric-xl text-primary">{conteo}</span>
              <button
                className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-95"
                onClick={() => setConteo(conteo + 1)}
                aria-label="Sumar"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>
        </section>

        {/* Batches */}
        <section className="bg-surface rounded-xl p-container-padding tactile-card">
          <h3 className="font-headline-md text-headline-md text-primary mb-element-gap flex items-center gap-2">
            <span className="material-symbols-outlined">date_range</span>
            Lotes y Vencimientos
          </h3>
          {hayLotes ? (
            <div className="space-y-element-gap">
              {articulo.lotes.map((l, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-4 border-[1.5px] border-surface-variant rounded-lg bg-surface-bright"
                >
                  <div>
                    <span className="font-label-lg text-label-lg text-on-surface block">Lote: {l.lote}</span>
                    <span className="font-body-md text-body-md text-on-surface-variant mt-1">
                      Vence: {l.fecha_vencimiento || "—"} · {l.ubicacion || "—"}
                    </span>
                  </div>
                  <span className="font-metric-lg text-metric-lg text-on-surface bg-surface-variant px-3 py-1 rounded">
                    Q: {l.cantidad}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant">
              Este producto aún no tiene tomas registradas en este conteo.
            </p>
          )}
        </section>

        {/* Actions */}
        <section className="flex flex-col gap-element-gap pt-4 pb-2">
          <button
            className="w-full bg-primary text-on-primary font-button-text text-button-text h-[56px] min-h-touch-target-min rounded-lg tactile-button-primary flex items-center justify-center gap-2 active:translate-y-[2px] transition-transform"
            onClick={() => navigate("/escanear")}
          >
            <span className="material-symbols-outlined">barcode_scanner</span>
            Escanear Otro
          </button>
          <button
            className="w-full bg-surface text-primary border-2 border-primary font-button-text text-button-text h-[56px] min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 active:translate-y-[2px] transition-transform"
            onClick={() => navigate("/inicio")}
          >
            <span className="material-symbols-outlined">home</span>
            Inicio
          </button>
        </section>
      </main>
      <BottomNav activo="escanear" />
    </>
  );
}
