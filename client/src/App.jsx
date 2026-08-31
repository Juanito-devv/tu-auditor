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
import { puedeAccederPanel } from "./lib/auth.js";

// Guard: solo el rol admin puede entrar al panel administrativo.
function RequerirPanel({ children }) {
  const location = useLocation();
  if (!puedeAccederPanel()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/escanear" element={<Scanner />} />
        <Route path="/detalle/:term" element={<Detalle />} />
        <Route path="/graficos" element={<Dashboard />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/venta" element={<Operacion modo="venta" />} />
        <Route path="/ingreso" element={<Operacion modo="ingreso" />} />
        <Route path="/admin" element={<RequerirPanel><Admin /></RequerirPanel>} />
        <Route path="/admin/inventory" element={<RequerirPanel><InventoryAdmin /></RequerirPanel>} />
        <Route path="/admin/reportes" element={<RequerirPanel><ReportesAdmin /></RequerirPanel>} />
      </Routes>
    </div>
  );
}
