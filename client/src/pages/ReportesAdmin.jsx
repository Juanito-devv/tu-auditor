import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { cerrarSesion } from "../lib/auth.js";

function Material({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}
function fmtN(n) {
  return Number(n || 0).toLocaleString("es-VE");
}

function NavBtn({ onClick, icono, label, activo }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        activo ? "bg-[#EAF1FD] text-[#1366D9]" : "text-[#48505E] hover:bg-[#F0F1F3]"
      }`}
    >
      <Material name={icono} className="text-[20px]" /> {label}
    </button>
  );
}

export default function ReportesAdmin() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    let activo = true;
    apiFetch("/kpis").then((r) => (r.ok ? r.json() : null)).then((d) => activo && d && setKpis(d)).catch(() => {});
    return () => { activo = false; };
  }, []);

  const sc = kpis?.stock_critico;
  const venc = kpis?.vencimientos;
  const imp = kpis?.impuestos;

  return (
    <div className="landing-kanban min-h-screen bg-[#F0F1F3] flex">
      <aside className="w-[240px] shrink-0 bg-white border-r border-[#E6E8EC] hidden md:flex flex-col sticky top-0 h-screen">
        <Logo />
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          <NavBtn onClick={() => navigate("/admin")} icono="dashboard" label="Dashboard" />
          <NavBtn onClick={() => navigate("/admin/inventory")} icono="inventory_2" label="Inventory" />
          <NavBtn onClick={() => navigate("/ingreso")} icono="add_box" label="Ingreso" />
          <NavBtn onClick={() => navigate("/admin/reportes")} icono="monitoring" label="Reportes" activo />
        </nav>
        <div className="p-3">
          <NavBtn onClick={() => { cerrarSesion(); navigate("/login"); }} icono="logout" label="Salir" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E6E8EC] h-[70px] flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="md:hidden text-[#1366D9]"><Material name="arrow_back" /></button>
            <div>
              <h1 className="text-lg font-semibold text-[#1B2430]">Reportes</h1>
              <p className="text-xs text-[#667085]">Resumen del inventario</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-6 space-y-4 overflow-y-auto pb-[72px] md:pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card titulo="Stock crítico">
              <div className="space-y-2 text-sm">
                <Fila label="Crítico" valor={sc?.critico} color="#DA3E33" />
                <Fila label="Bajo" valor={sc?.bajo} color="#E19133" />
                <Fila label="Óptimo" valor={sc?.normal} color="#10A760" />
              </div>
            </Card>
            <Card titulo="Vencimientos">
              <div className="space-y-2 text-sm">
                <Fila label="≤ 3 meses" valor={venc?.en_3m} color="#F79009" />
                <Fila label="3-6 meses" valor={venc?.en_6m} color="#6E5AE0" />
                <Fila label="Lejanos" valor={venc?.lejanos} color="#1366D9" />
              </div>
            </Card>
            <Card titulo="Impuestos">
              <div className="space-y-2 text-sm">
                <Fila label="Exento" valor={imp?.exento} color="#0ACF83" />
                <Fila label="Gravado" valor={imp?.gravado} color="#1366D9" />
                <Fila label="Sin definir" valor={imp?.sin_definir} color="#858D9D" />
              </div>
            </Card>
          </div>
          <p className="text-xs text-[#667085]">Datos del maestro real (Google Sheets, caché 5 min).</p>
        </main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-5 h-[70px] border-b border-[#E6E8EC]">
      <span className="relative w-8 h-8" aria-hidden>
        <span className="absolute bottom-0 left-0 w-8 h-8 rounded-[5px] bg-[#009ED8]" />
        <span className="absolute top-0 right-0 w-[22px] h-[22px] bg-[#0ACF83] rounded-sm" />
        <span className="absolute top-[6px] right-[3px] w-[13px] h-[13px] bg-white rounded-sm" />
      </span>
      <span className="font-semibold text-[#009ED8]">Tu Auditor</span>
    </div>
  );
}

function Card({ titulo, children }) {
  return (
    <div className="rounded-lg border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <h3 className="text-[#1B2430] font-semibold mb-4">{titulo}</h3>
      {children}
    </div>
  );
}

function Fila({ label, valor, color }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#F0F1F3] last:border-0">
      <span className="flex items-center gap-2 text-[#48505E]">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-semibold text-[#1B2430]">{valor == null ? "…" : fmtN(valor)}</span>
    </div>
  );
}
