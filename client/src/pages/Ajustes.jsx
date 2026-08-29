import React from "react";
import TopBar from "../components/TopBar.jsx";
import BottomNav from "../components/BottomNav.jsx";

export default function Ajustes() {
  return (
    <>
      <TopBar />
      <main className="max-w-2xl mx-auto px-section-margin pt-element-gap pb-[96px]">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Ajustes</h2>
        <section className="bg-surface rounded-xl p-container-padding tactile-card space-y-4">
          <div className="flex items-center gap-4 p-4 border-[1.5px] border-surface-variant rounded-lg">
            <span className="material-symbols-outlined text-primary">refresh</span>
            <div>
              <p className="font-label-lg text-label-lg text-on-surface">Recargar datos</p>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                Fuerza la actualización del caché de inventario.
              </p>
            </div>
          </div>
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
