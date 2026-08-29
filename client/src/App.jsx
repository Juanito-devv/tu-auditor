import React from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Inicio from "./pages/Inicio.jsx";
import Scanner from "./pages/Scanner.jsx";
import Detalle from "./pages/Detalle.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Ajustes from "./pages/Ajustes.jsx";

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
      </Routes>
    </div>
  );
}
