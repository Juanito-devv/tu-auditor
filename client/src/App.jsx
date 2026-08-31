import React from "react";
import { Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/escanear" element={<Scanner />} />
        <Route path="/detalle/:term" element={<Detalle />} />
        <Route path="/graficos" element={<Dashboard />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/venta" element={<Operacion modo="venta" />} />
        <Route path="/ingreso" element={<Operacion modo="ingreso" />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/inventory" element={<InventoryAdmin />} />
        <Route path="/admin/reportes" element={<ReportesAdmin />} />
      </Routes>
    </div>
  );
}
