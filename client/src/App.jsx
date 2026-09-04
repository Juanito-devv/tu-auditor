import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Inicio from "./pages/Inicio.jsx";
import Scanner from "./pages/Scanner.jsx";
import Detalle from "./pages/Detalle.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Ajustes from "./pages/Ajustes.jsx";
import Operacion from "./pages/Operacion.jsx";
import Admin from "./pages/Admin.jsx";
import InventoryAdmin from "./pages/InventoryAdmin.jsx";
import ReportesAdmin from "./pages/ReportesAdmin.jsx";
import Login from "./pages/Login.jsx";
import PwaInstall from "./components/PwaInstall.jsx";
import { PanelProvider } from "./lib/panel.jsx";
import { puedeAccederPanel } from "./lib/auth.js";

// Guard: solo el rol admin puede entrar al panel administrativo.
function RequerirPanel({ children }) {
  const location = useLocation();
  if (!puedeAccederPanel()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

// Panel admin como app separada: mismas páginas pero bajo /panel/*, con su
// propio contexto (esPanel) para header/nav dedicados.
function Panel({ children }) {
  return (
    <RequerirPanel>
      <PanelProvider esPanel>{children}</PanelProvider>
    </RequerirPanel>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        {/* Demo pública (acceso libre) */}
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/escanear" element={<Scanner />} />
        <Route path="/detalle/:term" element={<Detalle />} />
        <Route path="/graficos" element={<Dashboard />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/ingreso" element={<Operacion />} />

        {/* Panel admin = app separada con su propio layout */}
        <Route path="/panel" element={<Panel><Navigate to="/panel/graficos" replace /></Panel>} />
        <Route path="/panel/inicio" element={<Panel><Inicio /></Panel>} />
        <Route path="/panel/escanear" element={<Panel><Scanner /></Panel>} />
        <Route path="/panel/detalle/:term" element={<Panel><Detalle /></Panel>} />
        <Route path="/panel/graficos" element={<Panel><Dashboard /></Panel>} />
        <Route path="/panel/ajustes" element={<Panel><Ajustes /></Panel>} />
        <Route path="/panel/ingreso" element={<Panel><Operacion /></Panel>} />

        {/* Módulos 100% admin */}
        <Route path="/admin" element={<RequerirPanel><Admin /></RequerirPanel>} />
        <Route path="/admin/inventory" element={<RequerirPanel><InventoryAdmin /></RequerirPanel>} />
        <Route path="/admin/reportes" element={<RequerirPanel><ReportesAdmin /></RequerirPanel>} />
      </Routes>
      <PwaInstall />
    </div>
  );
}
