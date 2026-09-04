import React, { createContext, useContext } from "react";

// Contexto que distingue si estamos dentro del PANEL ADMINISTRATIVO (app
// separada con su propio layout y header) o en la DEMO pública.
// esPanel === true  -> rutas bajo /panel/* (admin con sesión) usando /panel/*
// esPanel === false -> demo pública usando /inicio, /graficos, /ajustes, etc.
const PanelContext = createContext({ esPanel: false });

export function PanelProvider({ esPanel, children }) {
  return (
    <PanelContext.Provider value={{ esPanel }}>{children}</PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}

// Devuelve las rutas base de navegación según el modo (panel vs demo).
export function useRutas() {
  const { esPanel } = usePanel();
  return {
    esPanel,
    inicio: esPanel ? "/panel/inicio" : "/inicio",
    graficos: esPanel ? "/panel/graficos" : "/graficos",
    ajustes: esPanel ? "/panel/ajustes" : "/ajustes",
    ingreso: esPanel ? "/panel/ingreso" : "/ingreso",
    home: esPanel ? "/panel/graficos" : "/inicio",
  };
}
