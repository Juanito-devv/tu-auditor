import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";
import { apiFetch } from "../api.js";

export default function Inicio() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  const [kpis, setKpis] = useState(null);
  const [estado, setEstado] = useState("inicial"); // inicial | activo | buscando | error | exito
  const [errorMsg, setErrorMsg] = useState("");
  const [manual, setManual] = useState("");

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
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("scanner-host");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.min(w * 0.75, 300), height: Math.min(h * 0.45, 200) }) },
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

  function irAlArticulo(valor) {
    detenerScanner();
    setEstado("exito");
    navigate(`/detalle/${encodeURIComponent(valor)}`);
  }

  function cerrarCamara() {
    detenerScanner();
    setEstado("inicial");
  }

  function buscarManual(e) {
    e.preventDefault();
    const t = manual.trim();
    if (t) irAlArticulo(t);
  }

  const totalEsc = kpis ? kpis.vencimientos.total_tomas : "…";
  const alertas = kpis ? kpis.stock_critico.critico : "…";

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

        {/* Escáner */}
        <div className="relative w-full aspect-[4/5] sm:aspect-square bg-inverse-surface rounded-xl overflow-hidden border-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)] flex-grow flex flex-col items-center justify-center">
          {(estado === "activo" || estado === "buscando") && (
            <div
              id="scanner-host"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {(estado === "activo" || estado === "buscando") && (
            <>
              <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 z-10">
                <div className="absolute inset-0 bg-transparent ring-[100vw] ring-black/50 rounded-lg overflow-hidden border border-white/20">
                  <div className="scan-laser"></div>
                </div>
                <div className="scanner-corner scanner-tl rounded-tl-lg"></div>
                <div className="scanner-corner scanner-tr rounded-tr-lg"></div>
                <div className="scanner-corner scanner-bl rounded-bl-lg"></div>
                <div className="scanner-corner scanner-br rounded-br-lg"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="material-symbols-outlined text-white/50 text-4xl">qr_code_scanner</span>
                </div>
              </div>
            </>
          )}

          {estado === "inicial" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                <span className="material-symbols-outlined text-white/60 text-6xl mb-4">qr_code_scanner</span>
                <p className="font-label-lg text-label-lg text-on-primary">
                  Activa la cámara para escanear
                </p>
              </div>
            </div>
          )}

          {estado === "activo" && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-white font-label-lg text-label-lg px-4 z-10 shadow-sm drop-shadow-md">
              Alinea el código de barras o QR dentro del marco
            </p>
          )}
        </div>

        {estado === "error" && (
          <div className="aviso--error p-4 rounded-lg border-[1.5px] border-error bg-error-container text-on-error-container font-body-md">
            {errorMsg}
          </div>
        )}

        {/* Controles */}
        <div className="flex flex-col gap-element-gap mt-auto pt-4">
          {estado === "inicial" && (
            <button
              className="w-full bg-primary text-on-primary font-button-text text-button-text min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 tactile-btn-primary border-[1.5px] border-primary-container transition-transform duration-100"
              onClick={abrirCamara}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                photo_camera
              </span>
              Activar cámara
            </button>
          )}
          {(estado === "activo" || estado === "buscando") && (
            <button
              className="w-full bg-surface-container-lowest text-on-surface-variant font-button-text text-button-text min-h-touch-target-min rounded-lg flex items-center justify-center gap-2 border-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)] active:scale-95 transition-transform duration-100"
              onClick={cerrarCamara}
            >
              <span className="material-symbols-outlined">close</span>
              Cerrar cámara
            </button>
          )}

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
        </div>
      </main>
      <BottomNav activo="inicio" />
    </>
  );
}
