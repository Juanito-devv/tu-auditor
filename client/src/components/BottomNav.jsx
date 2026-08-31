import React from "react";
import { NavLink } from "react-router-dom";

function Tab({ to, fill, icono, etiqueta }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center pt-2 h-full w-full hover:bg-surface-container-low active:translate-y-0.5 transition-all duration-200 ${
          isActive
            ? "text-primary border-t-4 border-primary pt-1 bg-surface-container-low"
            : "text-on-surface-variant"
        }`
      }
    >
      <span
        className="material-symbols-outlined text-2xl"
        style={
          fill
            ? { fontVariationSettings: "'FILL' 1" }
            : { fontVariationSettings: "'FILL' 0" }
        }
      >
        {icono}
      </span>
      <span className="font-label-lg text-[14px] mt-1">{etiqueta}</span>
    </NavLink>
  );
}

export default function BottomNav({ activo }) {
  return (
    <nav className="fixed bottom-0 w-full h-[76px] z-50 border-t-[1.5px] border-surface-variant shadow-[0px_-2px_4px_rgba(0,0,0,0.15)]">
      <div className="fixed bottom-0 left-0 right-0 flex justify-around items-center px-section-margin bg-surface h-[76px]">
        <Tab to="/inicio" fill={activo === "inicio"} icono="home" etiqueta="Inicio" />
        <Tab to="/graficos" fill={activo === "graficos"} icono="query_stats" etiqueta="Gráficos" />
        <Tab to="/ajustes" fill={activo === "ajustes"} icono="settings" etiqueta="Ajustes" />
      </div>
    </nav>
  );
}
