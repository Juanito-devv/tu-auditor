import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";
import { apiFetch } from "../api.js";

export default function Inicio() {
  const scannerRef = useRef(null);

  const [kpis, setKpis] = useState(null);
  const [estado, setEstado] = useState("inicial"); // inicial | activo | buscando | error | registro
  const [errorMsg, setErrorMsg] = useState("");
  const [manual, setManual] = useState("");
  const [flash, setFlash] = useState(false);

  // Datos del artículo escaneado para el panel de registro de toma
  const [registro, setRegistro] = useState(null); // { articulo_id, codigo_barras, codigo_articulo, descripcion }
  const [form, setForm] = useState({ lote: "", fecha: "", ubicacion: "", cantidad: "" });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");

  useEffect(() => {
    let activo = true;
    apiFetch("/kpis")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (activo && d) setKpis(d);
      })
      .catch(() => {});
    return () => {
      activo = false;
      detenerScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function detenerScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (_) {}
      try {
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
  }

  async function abrirCamara() {
    setEstado("activo");
    setErrorMsg("");
    try {
      if (scannerRef.current) await detenerScanner();
      // Esperar a que React renderice el div #scanner-host antes de iniciar
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      // Carga diferida: solo descarga html5-qrcode al abrir la cámara
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      // FIX iOS: con demasiados formatos activos el decodificador ZXing se vuelve
      // inestable en Safari/iPhone y NO reconoce códigos EAN-13/UPC (falla ~95%).
      // Se limita a los formatos de código de barras estándar de productos.
      const SOLO_BARRAS = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
      ];

      const scanner = new Html5Qrcode("scanner-host");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (w, h) => ({
            width: Math.min(w * 0.92, 360),
            height: Math.min(h * 0.75, 260),
          }),
          formatsToSupport: SOLO_BARRAS,
        },
        (decodedText) => {
          irAlArticulo(decodedText);
        },
        () => {}
      );
    } catch (e) {
      setEstado("error");
      setErrorMsg("No pudimos abrir la cámara. Ingresa el código manualmente.");
    }
  }

  async function irAlArticulo(valor) {
    setFlash(true);
    setTimeout(() => setFlash(false), 650);
    detenerScanner();
    setErrorMsg("");
    setErrorGuardado("");
    setGuardado(false);
    setEstado("buscando");
    try {
      const res = await apiFetch(`/articulo/${encodeURIComponent(valor)}`);
      if (!res.ok) {
        setEstado("error");
        setErrorMsg(`No encontramos un producto con el código ${valor}.`);
        return;
      }
      const data = await res.json();
      setRegistro({
        articulo_id: data.articulo_id,
        codigo_barras: data.codigo_barras || valor,
        codigo_articulo: data.codigo_articulo || "—",
        descripcion: data.descripcion || "Sin descripción",
      });
      setForm({ lote: "", fecha: "", ubicacion: "", cantidad: "" });
      setEstado("registro");
    } catch (_) {
      setEstado("error");
      setErrorMsg("Ocurrió un error al consultar el producto. Inténtalo de nuevo.");
    }
  }

  function cerrarCamara() {
    detenerScanner();
    setEstado("inicial");
  }

  function cancelarRegistro() {
    setRegistro(null);
    setEstado("inicial");
  }

  function buscarManual(e) {
    e.preventDefault();
    const t = manual.trim();
    if (t) irAlArticulo(t);
  }

  async function guardarToma(e) {
    e.preventDefault();
    const cantidad = Number(form.cantidad);
    if (!cantidad || cantidad <= 0) {
      setErrorGuardado("Ingresa una cantidad contada mayor a 0.");
      return;
    }
    setGuardando(true);
    setErrorGuardado("");
    try {
      const res = await apiFetch("/tomas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_barras: registro.codigo_barras,
          lote: form.lote,
          fecha_vencimiento: form.fecha || null,
          ubicacion: form.ubicacion,
          cantidad,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorGuardado(d.error ? "No se pudo guardar la toma." : "No se pudo guardar la toma.");
        setGuardando(false);
        return;
      }
      setGuardando(false);
      setGuardado(true);
    } catch (_) {
      setErrorGuardado("Error de conexión al guardar la toma.");
      setGuardando(false);
    }
  }

  const totalEsc = kpis ? kpis.vencimientos.total_tomas : "…";
  const alertas = kpis ? kpis.stock_critico.critico : "…";

  const camaraActiva = estado === "activo" || estado === "buscando";

  return (
    <>
      <TopBar />
      <main className="flex-grow flex flex-col p-container-padding gap-gutter w-full max-w-2xl mx-auto">
        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-gutter">
          <div className="bg-surface-container-lowest border-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)] rounded-lg p-4 flex flex-col items-center justify-center">
            <span className="font-label-lg text-label-lg text-on-surface-variant mb-1">Total Escaneado</span>
            <span className="font-metric-xl text-metric-xl text-primary">{totalEsc}</span>
          </div>
          <div className="bg-surface-container-lowest border-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)] rounded-lg p-4 flex flex-col items-center justify-center">
            <span className="font-label-lg text-label-lg text-on-surface-variant mb-1">Alertas</span>
            <span className="font-metric-xl text-metric-xl text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              {alertas}
            </span>
          </div>
        </div>

        {/* Acceso rápido: Ingreso */}
        <Link
          to="/ingreso"
          className="bg-primary text-on-primary font-button-text text-button-text text-sm min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 tactile-btn-primary active:translate-y-[2px] transition-transform"
        >
          <span className="material-symbols-outlined">add_box</span>
          Ingresar
        </Link>

        {/* Escáner */}
        {estado !== "registro" && (
        <div
          onClick={abrirCamara}
          className={
            "relative w-full overflow-hidden flex items-center justify-center select-none cursor-pointer " +
            (estado === "inicial"
              ? "border-[1.5px] border-[#D0D3D9] shadow-[0px_2px_8px_rgba(16,24,40,0.08)] bg-white rounded-2xl aspect-[16/10] sm:aspect-video"
              : "flex-grow aspect-[4/5] sm:aspect-square rounded-2xl bg-white")
          }
        >
          {camaraActiva && (
            <div
              id="scanner-host"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {camaraActiva && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                {/* Marco blanco translúcido dentro de la cámara */}
                <div className="scanner-frame absolute inset-0 bg-white/10 rounded-lg overflow-hidden">
                  <div className="scan-laser"></div>
                </div>
                <div className="scanner-corner scanner-tl"></div>
                <div className="scanner-corner scanner-tr"></div>
                <div className="scanner-corner scanner-bl"></div>
                <div className="scanner-corner scanner-br"></div>
                {flash && <div className="scan-flash"></div>}
              </div>
            </div>
          )}

          {estado === "inicial" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                <span
                  className="gradient-icon float-icon material-symbols-outlined text-7xl mb-4"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  scan
                </span>
                <p className="font-headline-sm text-headline-sm text-[#1B2430]">
                  Toca para escanear
                </p>
                <p className="font-body-md text-body-md text-[#667085] mt-1">
                  Apunta a un código de barras
                </p>
              </div>
            </div>
          )}

          {estado === "activo" && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-white font-label-lg text-label-lg px-4 z-10 shadow-sm drop-shadow-md">
              Alinea el código de barras dentro del marco
            </p>
          )}
        </div>
        )}

        {estado === "error" && (
          <div className="aviso--error p-4 rounded-lg border-[1.5px] border-error bg-error-container text-on-error-container font-body-md">
            {errorMsg}
          </div>
        )}

        {/* Panel de registro de toma (post-escaneo) */}
        {estado === "registro" && registro && (
          <section className="bg-surface rounded-xl p-container-padding border-[1.5px] border-surface-variant shadow-[0px_2px_8px_rgba(16,24,40,0.08)] flex flex-col gap-element-gap">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-label-lg text-label-lg text-outline uppercase tracking-wider text-sm">
                  {registro.codigo_barras}
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary">{registro.descripcion}</h2>
              </div>
              <span
                className="material-symbols-outlined text-on-surface-variant cursor-pointer"
                onClick={cancelarRegistro}
                aria-label="Cerrar"
              >
                close
              </span>
            </div>

            {/* Datos de tomas_inventario */}
            <div className="grid grid-cols-2 gap-element-gap">
              <div className="bg-surface-container-lowest border-[1.5px] border-surface-variant rounded-lg p-3">
                <span className="font-label-lg text-label-lg text-on-surface-variant block">Código de barras</span>
                <span className="font-body-md text-body-md text-on-surface">{registro.codigo_barras}</span>
              </div>
              <div className="bg-surface-container-lowest border-[1.5px] border-surface-variant rounded-lg p-3">
                <span className="font-label-lg text-label-lg text-on-surface-variant block">Código de artículo</span>
                <span className="font-body-md text-body-md text-on-surface">{registro.codigo_articulo}</span>
              </div>
              <div className="bg-surface-container-lowest border-[1.5px] border-surface-variant rounded-lg p-3 col-span-2">
                <span className="font-label-lg text-label-lg text-on-surface-variant block">Artículo ID</span>
                <span className="font-body-md text-body-md text-on-surface">{registro.articulo_id ?? "—"}</span>
              </div>
            </div>

            {guardado ? (
              <div className="p-4 rounded-lg border-[1.5px] border-secondary bg-secondary-fixed text-on-secondary-fixed flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                ¡Toma guardada correctamente!
              </div>
            ) : (
              <form onSubmit={guardarToma} className="flex flex-col gap-element-gap">
                <div className="grid grid-cols-2 gap-element-gap">
                  <label className="flex flex-col gap-1">
                    <span className="font-label-lg text-label-lg text-on-surface-variant">Lote</span>
                    <input
                      value={form.lote}
                      onChange={(e) => setForm({ ...form, lote: e.target.value })}
                      placeholder="Ej: L2401"
                      className="h-[52px] bg-surface-container-lowest border-[1.5px] border-outline rounded-lg px-4 font-body-md focus:border-[3px] focus:border-primary-container transition-all outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-label-lg text-label-lg text-on-surface-variant">Fecha vencimiento</span>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                      className="h-[52px] bg-surface-container-lowest border-[1.5px] border-outline rounded-lg px-4 font-body-md focus:border-[3px] focus:border-primary-container transition-all outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-label-lg text-label-lg text-on-surface-variant">Ubicación</span>
                    <input
                      value={form.ubicacion}
                      onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                      placeholder="Ej: A-1-3"
                      className="h-[52px] bg-surface-container-lowest border-[1.5px] border-outline rounded-lg px-4 font-body-md focus:border-[3px] focus:border-primary-container transition-all outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-label-lg text-label-lg text-on-surface-variant">Cantidad contada</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.cantidad}
                      onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                      placeholder="0"
                      className="h-[52px] bg-surface-container-lowest border-[1.5px] border-outline rounded-lg px-4 font-body-md focus:border-[3px] focus:border-primary-container transition-all outline-none"
                    />
                  </label>
                </div>

                {errorGuardado && (
                  <div className="aviso--error p-3 rounded-lg border-[1.5px] border-error bg-error-container text-on-error-container font-body-md">
                    {errorGuardado}
                  </div>
                )}

                <div className="flex gap-element-gap">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex-1 bg-primary text-on-primary font-button-text text-button-text h-[56px] min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 tactile-btn-primary active:translate-y-[2px] transition-transform disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined">save</span>
                    {guardando ? "Guardando…" : "Guardar toma"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelarRegistro}
                    className="w-auto px-4 bg-surface text-on-surface-variant font-button-text text-button-text h-[56px] min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 border-[1.5px] border-surface-variant"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {guardado && (
              <button
                onClick={() => {
                  setRegistro(null);
                  setGuardado(false);
                  setEstado("inicial");
                }}
                className="w-full bg-primary text-on-primary font-button-text text-button-text h-[56px] min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 tactile-btn-primary active:translate-y-[2px] transition-transform"
              >
                <span className="material-symbols-outlined">barcode_scanner</span>
                Escanear otro
              </button>
            )}
          </section>
        )}

        {/* Controles */}
        <div
          className={
            "flex flex-col gap-element-gap " +
            (estado === "inicial" ? "pt-4" : "mt-auto pt-4")
          }
        >
          {camaraActiva && (
            <button
              className="w-full bg-surface-container-lowest text-on-surface-variant font-button-text text-button-text min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 border-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)] active:scale-95 transition-transform duration-100"
              onClick={cerrarCamara}
            >
              <span className="material-symbols-outlined">close</span>
              Cerrar cámara
            </button>
          )}

          {estado !== "registro" && (
            <form
              onSubmit={buscarManual}
              className="flex flex-col sm:flex-row gap-element-gap"
            >
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="O ingresa el código manualmente"
                inputMode="numeric"
                aria-label="Código manual"
                className="flex-1 h-[56px] bg-surface-container-lowest border-[1.5px] border-outline rounded-lg px-4 font-body-md focus:border-[3px] focus:border-primary-container focus:ring-0 transition-all outline-none"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-surface-container-lowest text-on-surface-variant font-button-text text-button-text min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 border-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)] active:scale-95 transition-transform duration-100 px-6"
              >
                <span className="material-symbols-outlined">keyboard</span>
                Buscar
              </button>
            </form>
          )}
        </div>
      </main>
      <BottomNav activo="inicio" />
    </>
  );
}
