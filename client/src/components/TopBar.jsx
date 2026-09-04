import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePanel, useRutas } from "../lib/panel.jsx";
import { sesionActual, cerrarSesion } from "../lib/auth.js";

function LogoApp({ size = "w-8 h-8" }) {
  const inner = size === "w-8 h-8" ? "w-[22px] h-[22px]" : "w-6 h-6";
  const inner2 = size === "w-8 h-8" ? "w-[13px] h-[13px]" : "w-[9px] h-[9px]";
  return (
    <span className={`relative ${size}`} aria-hidden>
      <span className={`absolute bottom-0 left-0 ${size} rounded-[5px] bg-[#009ED8]`} />
      <span className={`absolute top-0 right-0 ${inner} bg-[#0ACF83] rounded-sm`} />
      <span className={`absolute top-[6px] right-[3px] ${inner2} bg-white rounded-sm`} />
    </span>
  );
}

export default function TopBar() {
  const navigate = useNavigate();
  const { esPanel } = usePanel();
  const rutas = useRutas();
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const sesion = sesionActual();
  const esAdmin = !!(sesion && sesion.autenticado && sesion.rol === "admin");

  useEffect(() => {
    function cerrar(e) {
      if (ref.current && !ref.current.contains(e.target)) setMenu(false);
    }
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  function irLogin() {
    setMenu(false);
    navigate("/login");
  }

  return (
    <header className="w-full top-0 sticky z-40 bg-surface border-b-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)]">
      <div className="flex justify-between items-center h-[64px] px-container-padding w-full">
        <button
          onClick={() => navigate(rutas.home)}
          className="flex items-center gap-2 text-primary hover:bg-surface-container-high active:scale-95 transition-transform duration-100 p-1.5 rounded-lg"
          aria-label="AuditApp"
        >
          <LogoApp />
          <span className="font-headline-md text-headline-md text-primary uppercase tracking-tight hidden sm:inline">
            AuditApp
          </span>
          {esPanel && (
            <span className="text-[10px] font-semibold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Panel
            </span>
          )}
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenu((m) => !m)}
            className="text-primary hover:bg-surface-container-high active:scale-95 transition-transform duration-100 p-2 rounded-full flex items-center justify-center"
            aria-label="Perfil"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_circle
            </span>
          </button>

          {menu && (
            <div className="absolute right-2 top-[50px] w-64 bg-surface rounded-xl border-[1.5px] border-surface-variant shadow-[0_8px_24px_rgba(16,24,40,0.18)] z-50 overflow-hidden">
              {esAdmin ? (
                <>
                  <div className="px-4 py-3 border-b border-surface-variant">
                    <p className="font-body-md text-sm text-on-surface capitalize">{sesion.usuario}</p>
                    <p className="text-xs text-on-surface-variant">Rol: administrador</p>
                  </div>
                  <button
                    onClick={() => { setMenu(false); navigate(rutas.graficos); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-body-md text-on-surface hover:bg-surface-container-low text-left"
                  >
                    <span className="material-symbols-outlined text-lg">query_stats</span> Ir al panel
                  </button>
                  <button
                    onClick={() => { setMenu(false); navigate("/"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-body-md text-on-surface hover:bg-surface-container-low text-left"
                  >
                    <span className="material-symbols-outlined text-lg">storefront</span> Demo pública
                  </button>
                  <button
                    onClick={() => { setMenu(false); cerrarSesion(); navigate(rutas.home); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-body-md text-error hover:bg-error-container/40 text-left border-t border-surface-variant"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span> Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-[#F79009]">science</span>
                    <div>
                      <p className="font-body-md text-sm text-on-surface">Entorno de pruebas</p>
                      <p className="text-xs text-on-surface-variant">Demo de acceso libre</p>
                    </div>
                  </div>
                  <button
                    onClick={irLogin}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-body-md text-primary hover:bg-surface-container-low text-left"
                  >
                    <span className="material-symbols-outlined text-lg">login</span> Iniciar sesión
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
