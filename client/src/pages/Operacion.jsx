import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { registrarVenta, registrarIngreso } from "../lib/ops.js";

const MODO = {
  venta: { titulo: "Caja · Venta", verbo: "Cobrar", icono: "point_of_sale", accent: "#10A760", buscaStock: true },
  ingreso: { titulo: "Ingreso · Agregar", verbo: "Registrar Ingreso", icono: "add_box", accent: "#1366D9", buscaStock: false },
};

function fmtBs(n) {
  return "Bs " + Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Operacion({ modo: modoKey }) {
  const navigate = useNavigate();
  const cfg = MODO[modoKey] || MODO.venta;
  const scannerRef = useRef(null);

  const [items, setItems] = useState([]); // {codigo, descripcion, precio, cantidad, stock}
  const [estadoScan, setEstadoScan] = useState("inicial"); // inicial|activo|buscando|error
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [ticket, setTicket] = useState(null); // {n, items, total}
  const [pagando, setPagando] = useState(false);

  useEffect(() => {
    return () => detenerScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function detenerScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (_) {}
      try { scannerRef.current.clear(); } catch (_) {}
      scannerRef.current = null;
    }
  }

  function agregarProducto(art, cantidad) {
    if (!art) return;
    if (cfg.buscaStock) {
      const stock = Number(art.stock) || 0;
      if (cantidad > stock) {
        setAviso(`Solo hay ${stock} en stock de "${art.descripcion}".`);
        return;
      }
    }
    setAviso("");
    setItems((prev) => {
      const i = prev.findIndex((x) => x.codigo === art.codigo_articulo);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], cantidad: next[i].cantidad + cantidad };
        return next;
      }
      return [...prev, {
        codigo: art.codigo_articulo,
        descripcion: art.descripcion || "Sin descripción",
        precio: Number(art.precio_vigente) || 0,
        cantidad,
        stock: Number(art.stock) || 0,
      }];
    });
  }

  async function buscarEAgregar(term, cantidad = 1) {
    setBuscando(true);
    setAviso("");
    try {
      const res = await apiFetch(`/articulo/${encodeURIComponent(term)}`);
      if (!res.ok) {
        setAviso("No se encontró el producto con ese código.");
        setBuscando(false);
        return;
      }
      const d = await res.json();
      agregarProducto(d, cantidad);
    } catch (_) {
      setAviso("Error de conexión.");
    } finally {
      setBuscando(false);
    }
  }

  async function abrirCamara() {
    setEstadoScan("activo");
    setAviso("");
    try {
      if (scannerRef.current) await detenerScanner();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const SOLO_BARRAS = [
        Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
      ];
      const scanner = new Html5Qrcode("scanner-host-op");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, aspectRatio: { width: 3, height: 4 }, qrbox: (w, h) => ({ width: Math.min(w * 0.94, 340), height: Math.min(h * 0.92, 240) }), formatsToSupport: SOLO_BARRAS },
        (txt) => { detenerScanner(); setEstadoScan("inicial"); buscarEAgregar(txt); },
        () => {}
      );
    } catch (_) {
      setEstadoScan("error");
      setAviso("No pudimos abrir la cámara. Ingresa el código manualmente.");
    }
  }

  function cerrarCamara() { detenerScanner(); setEstadoScan("inicial"); }

  function cambiarCantidad(idx, delta) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const nueva = it.cantidad + delta;
      if (nueva <= 0) return it;
      if (cfg.buscaStock && nueva > it.stock) {
        setAviso(`Máximo disponible: ${it.stock}`);
        return it;
      }
      return { ...it, cantidad: nueva };
    }));
  }

  function quitarItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  async function cobrar() {
    if (items.length === 0) return;
    setPagando(true);
    const fn = modoKey === "ingreso" ? registrarIngreso : registrarVenta;
    const n = (await fn({ items })).ticket;
    setPagando(false);
    setTicket({ n, items, total, venta: modoKey !== "ingreso" });
  }

  function nuevaOperacion() {
    setTicket(null);
    setItems([]);
    setAviso("");
  }

  // Pantalla de ticket
  if (ticket) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <header className="bg-[#10A760] text-white px-container-padding py-6 flex flex-col items-center gap-1">
          <span className="material-symbols-outlined text-5xl">check_circle</span>
          <h1 className="font-headline-md text-headline-md font-bold">
            {ticket.venta ? "Venta registrada" : "Ingreso registrado"}
          </h1>
          <span className="text-white/90">{ticket.n}</span>
        </header>
        <main className="max-w-xl mx-auto w-full p-container-padding space-y-4">
          <section className="bg-surface rounded-xl tactile-card p-container-padding">
            {ticket.items.map((it, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-surface-variant last:border-0">
                <div className="flex-1 pr-3">
                  <p className="font-label-lg text-label-lg text-sm">{it.descripcion}</p>
                  <p className="text-on-surface-variant text-sm">
                    {it.cantidad} x {fmtBs(it.precio)}
                  </p>
                </div>
                <span className="font-metric-lg text-metric-lg">{fmtBs(it.precio * it.cantidad)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-surface-variant">
              <span className="font-headline-md text-headline-md">Total</span>
              <span className="font-metric-xl text-metric-xl text-primary">{fmtBs(ticket.total)}</span>
            </div>
          </section>
          <button
            className="w-full bg-primary text-on-primary font-button-text text-button-text h-[56px] rounded-lg tactile-button-primary"
            onClick={nuevaOperacion}
          >
            Nueva {ticket.venta ? "venta" : "operación"}
          </button>
          <button
            className="w-full bg-surface text-primary border-2 border-primary font-button-text text-button-text h-[56px] rounded-lg"
            onClick={() => navigate("/inicio")}
          >
            Volver al inicio
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="w-full sticky top-0 z-40 bg-surface border-b-[1.5px] border-surface-variant h-[60px] flex items-center px-container-padding gap-3">
        <button
          onClick={() => navigate("/inicio")}
          className="text-primary p-2 -ml-2 rounded-full hover:bg-surface-container-high active:scale-95 transition-transform"
          aria-label="Volver"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="font-headline-md text-headline-md text-primary leading-tight">{cfg.titulo}</h1>
        </div>
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <span className={`material-symbols-outlined`}>{cfg.icono}</span>
        </span>
      </header>

      <main className="max-w-xl mx-auto w-full p-container-padding space-y-gutter pb-[96px]">
        {/* Escáner compacto */}
        <div className="relative w-full overflow-hidden rounded-xl border-[1.5px] border-surface-variant bg-inverse-surface aspect-[16/9]">
          {(estadoScan === "activo" || estadoScan === "buscando") && (
            <div id="scanner-host-op" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {(estadoScan === "activo" || estadoScan === "buscando") && (
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
          )}
          {estadoScan === "inicial" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                <span className="material-symbols-outlined text-white/60 text-5xl mb-2">barcode_scanner</span>
                <p className="text-white font-label-lg text-label-lg">Escanea un producto</p>
              </div>
            </div>
          )}
          {estadoScan === "activo" && (
            <button
              onClick={cerrarCamara}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="Cerrar cámara"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>

        {/* Búsqueda manual */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) buscarEAgregar(codigo.trim()); }}
          className="flex gap-2"
        >
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código o búsqueda…"
            className="flex-1 h-[50px] bg-surface-container-lowest border-[1.5px] border-outline rounded-lg px-4 font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
          <button
            type="button"
            onClick={() => { if (estadoScan === "inicial") abrirCamara(); else cerrarCamara(); }}
            className="h-[50px] px-4 bg-primary text-on-primary rounded-lg flex items-center justify-center tactile-button-primary"
            aria-label="Cámara"
          >
            <span className="material-symbols-outlined">photo_camera</span>
          </button>
          <button
            type="submit"
            disabled={buscando}
            className="h-[50px] px-5 bg-surface-container-lowest text-on-surface-variant border-[1.5px] border-surface-variant rounded-lg flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined">{buscando ? "progress_activity" : "search"}</span>
          </button>
        </form>

        {aviso && (
          <div className="p-3 rounded-lg border-[1.5px] border-[#b26a00] bg-[#fff3e0] text-[#7a4a00] font-body-md text-sm">
            {aviso}
          </div>
        )}

        {/* Carrito */}
        <section className="bg-surface rounded-xl tactile-card p-container-padding">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-headline-md text-headline-md text-primary">Carrito</h2>
            <span className="font-body-md text-sm text-on-surface-variant">{items.length} ítem(s)</span>
          </div>
          {items.length === 0 ? (
            <p className="text-on-surface-variant py-6 text-center">Aún no hay productos. Escanea o busca uno.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it.codigo} className="flex items-center gap-3 p-3 border-[1.5px] border-surface-variant rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-label-lg text-label-lg text-sm truncate">{it.descripcion}</p>
                    <p className="text-on-surface-variant text-xs">{fmtBs(it.precio)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => cambiarCantidad(idx, -1)} className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center active:scale-95" aria-label="Restar">
                      <span className="material-symbols-outlined text-base">remove</span>
                    </button>
                    <span className="w-7 text-center font-metric-lg text-metric-lg">{it.cantidad}</span>
                    <button onClick={() => cambiarCantidad(idx, 1)} className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-95" aria-label="Sumar">
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  </div>
                  <span className="w-20 text-right font-metric-lg text-metric-lg">{fmtBs(it.precio * it.cantidad)}</span>
                  <button onClick={() => quitarItem(idx)} className="text-[#ba1a1a] p-1" aria-label="Quitar">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Total + cobrar */}
        <div className="bg-surface rounded-xl tactile-card p-container-padding flex items-center justify-between sticky bottom-[20px]">
          <div>
            <span className="text-on-surface-variant text-sm block">Total</span>
            <span className="font-metric-xl text-metric-xl text-primary">{fmtBs(total)}</span>
          </div>
          <button
            onClick={cobrar}
            disabled={items.length === 0 || pagando}
            className="h-[56px] px-6 bg-primary text-on-primary font-button-text text-button-text rounded-lg tactile-button-primary flex items-center gap-2 disabled:opacity-50"
            style={modoKey === "venta" ? { backgroundColor: "#10A760" } : undefined}
          >
            {pagando ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">{cfg.icono}</span>
            )}
            {cfg.verbo}
          </button>
        </div>
      </main>
    </div>
  );
}
