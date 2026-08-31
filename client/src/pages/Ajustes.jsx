import React, { useState } from "react";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";
import { apiFetch } from "../api.js";

export default function Ajustes() {
  const [recargando, setRecargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function recargarDatos() {
    setRecargando(true);
    setMensaje("");
    try {
      const res = await apiFetch("/cache/reload", { method: "POST" });
      const d = res.ok ? await res.json().catch(() => ({})) : null;
      setMensaje(d && d.ok ? "Datos recargados correctamente." : "No se pudo recargar.");
    } catch (_) {
      setMensaje("Error de conexión al recargar.");
    } finally {
      setRecargando(false);
    }
  }

  return (
    <>
      <TopBar />
      <main className="max-w-2xl mx-auto px-section-margin pt-element-gap pb-[96px]">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Ajustes</h2>
        <section className="bg-surface rounded-xl p-container-padding tactile-card space-y-4">
          <button
            className="w-full text-left flex items-center gap-4 p-4 border-[1.5px] border-surface-variant rounded-lg active:bg-surface-container-low transition-colors disabled:opacity-60"
            onClick={recargarDatos}
            disabled={recargando}
          >
            <span className="material-symbols-outlined text-primary">
              {recargando ? "progress_activity" : "refresh"}
            </span>
            <div>
              <p className="font-label-lg text-label-lg text-on-surface">
                {recargando ? "Recargando…" : "Recargar datos"}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                {mensaje || "Fuerza la actualización del caché de inventario."}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-4 p-4 border-[1.5px] border-surface-variant rounded-lg">
            <span className="material-symbols-outlined text-outline">info</span>
            <div>
              <p className="font-label-lg text-label-lg text-on-surface">Acerca de</p>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                Tu Auditor v0.9 · Demo
              </p>
            </div>
          </div>
        </section>
      </main>
      <BottomNav activo="ajustes" />
    </>
  );
}
