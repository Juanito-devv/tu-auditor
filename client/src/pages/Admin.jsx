import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../api.js";

function Material({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function fmtN(n) {
  return Number(n || 0).toLocaleString("es-VE");
}
function fmtBs(n) {
  return "Bs " + Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 });
}

const NAV = [
  { key: "dashboard", to: "/admin", icono: "dashboard", label: "Dashboard" },
  { key: "inventory", to: "/admin/inventory", icono: "inventory_2", label: "Inventory" },
  { key: "venta", to: "/venta", icono: "point_of_sale", label: "Venta" },
  { key: "ingreso", to: "/ingreso", icono: "add_box", label: "Ingreso" },
  { key: "reportes", to: "/admin/reportes", icono: "monitoring", label: "Reportes" },
];

function estadoStock(stock) {
  if (stock <= 10) return { texto: "Crítico", bg: "bg-[#FDECEA] text-[#DA3E33]" };
  if (stock <= 25) return { texto: "Bajo", bg: "bg-[#FFF4E5] text-[#E19133]" };
  return { texto: "En Stock", bg: "bg-[#E8F6EE] text-[#10A760]" };
}

function KpiCard({ icono, bg, color, titulo, valor }) {
  return (
    <div className="rounded-lg border border-[#E4E7EC] bg-white p-5 flex flex-col gap-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <span className={`w-11 h-11 rounded-[10px] flex items-center justify-center ${bg} ${color}`}>
        <Material name={icono} className="text-[22px]" />
      </span>
      <span className="text-2xl font-bold text-[#1B2430] leading-tight">{valor}</span>
      <span className="text-sm text-[#667085]">{titulo}</span>
    </div>
  );
}

function Sidebar({ activo }) {
  const navigate = useNavigate();
  return (
    <aside className="w-[240px] shrink-0 bg-white border-r border-[#E6E8EC] hidden md:flex flex-col sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-5 h-[70px] border-b border-[#E6E8EC]">
        <span className="relative w-8 h-8" aria-hidden>
          <span className="absolute bottom-0 left-0 w-8 h-8 rounded-[5px] bg-[#009ED8]" />
          <span className="absolute top-0 right-0 w-[22px] h-[22px] bg-[#0ACF83] rounded-sm" />
          <span className="absolute top-[6px] right-[3px] w-[13px] h-[13px] bg-white rounded-sm" />
        </span>
        <span className="font-semibold text-[#009ED8]">Tu Auditor</span>
      </div>
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => navigate(n.to)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activo === n.key
                ? "bg-[#EAF1FD] text-[#1366D9]"
                : "text-[#48505E] hover:bg-[#F0F1F3]"
            }`}
          >
            <Material name={n.icono} className="text-[20px]" />
            {n.label}
          </button>
        ))}
      </nav>
      <div className="p-3">
        <button
          onClick={() => navigate("/inicio")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#48505E] hover:bg-[#F0F1F3]"
        >
          <Material name="logout" className="text-[20px]" />
          Salir
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ activo }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-[#E6E8EC] h-[64px] flex justify-around items-center px-2">
      <MobileItem to="/inicio" activo={false} icono="home" label="Inicio" />
      <MobileItem to="/venta" activo={false} icono="point_of_sale" label="Venta" />
      <MobileItem to="/admin" activo={activo === "dashboard"} icono="dashboard" label="Admin" />
      <MobileItem to="/ingreso" activo={false} icono="add_box" label="Ingreso" />
    </nav>
  );
}
function MobileItem({ to, icono, label, activo }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg ${activo ? "text-[#1366D9]" : "text-[#667085]"}`}>
      <Material name={icono} className="text-[22px]" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    let activo = true;
    apiFetch("/kpis").then((r) => (r.ok ? r.json() : null)).then((d) => activo && d && setKpis(d)).catch(() => {});
    return () => { activo = false; };
  }, []);

  const sc = kpis?.stock_critico;
  const tot = kpis?.totales;
  const scTotal = sc ? sc.critico + sc.bajo + sc.normal : 0;
  const salud = scTotal ? Math.round((sc.normal / scTotal) * 100) : 0;

  return (
    <div className="landing-kanban min-h-screen bg-[#F0F1F3] flex">
      <Sidebar activo="dashboard" />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-[#E6E8EC] h-[70px] flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3 md:hidden">
            <span className="relative w-7 h-7" aria-hidden>
              <span className="absolute bottom-0 left-0 w-7 h-7 rounded-[4px] bg-[#009ED8]" />
              <span className="absolute top-0 right-0 w-[18px] h-[18px] bg-[#0ACF83] rounded-sm" />
            </span>
            <span className="font-semibold text-[#009ED8]">Tu Auditor</span>
          </div>
          <h1 className="hidden md:block text-lg font-semibold text-[#1B2430]">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-sm text-[#667085] bg-[#F0F1F3] px-3 py-1.5 rounded-lg">
              <Material name="bolt" className="text-base text-[#1366D9]" />
              Demo
            </span>
            <span className="w-9 h-9 rounded-lg bg-[#EAF1FD] text-[#1366D9] flex items-center justify-center">
              <Material name="account_circle" className="text-[22px]" />
            </span>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-6 space-y-5 pb-[80px] md:pb-6 overflow-y-auto">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icono="payments" bg="bg-[#E8F1FD]" color="text-[#1366D9]" titulo="Valuación total" valor={tot ? fmtBs(tot.valor_inventario) : "…"} />
            <KpiCard icono="inventory_2" bg="bg-[#EBFFED]" color="text-[#10A760]" titulo="Unidades" valor={tot ? fmtN(tot.total_unidades) : "…"} />
            <KpiCard icono="monitoring" bg="bg-[#ECEAFF]" color="text-[#6E5AE0]" titulo="Salud del stock" valor={sc ? `${salud}%` : "…"} />
            <KpiCard icono="warning" bg="bg-[#FDECEA]" color="text-[#DA3E33]" titulo="Ítems críticos" valor={sc ? fmtN(sc.critico) : "…"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Estado del stock */}
            <div className="rounded-lg border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
              <h3 className="text-[#1B2430] font-semibold mb-4">Estado del Stock</h3>
              <div className="space-y-3">
                <Banda etiqueta="Óptimo" valor={sc?.normal} color="#10A760" total={scTotal} />
                <Banda etiqueta="Bajo" valor={sc?.bajo} color="#E19133" total={scTotal} />
                <Banda etiqueta="Crítico" valor={sc?.critico} color="#DA3E33" total={scTotal} />
              </div>
            </div>
            {/* Categorías top */}
            <div className="rounded-lg border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
              <h3 className="text-[#1B2430] font-semibold mb-4">Unidades por Categoría</h3>
              <Categorias cat={kpis?.stock_por_categoria || []} />
            </div>
          </div>

          {/* Acciones principales */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => navigate("/venta")} className="rounded-lg p-5 text-left text-white bg-[#10A760] shadow-md hover:brightness-95 transition">
              <Material name="point_of_sale" className="text-3xl mb-3" />
              <span className="block font-semibold">Vender</span>
              <span className="text-white/80 text-sm">Abrir caja y carrito</span>
            </button>
            <button onClick={() => navigate("/ingreso")} className="rounded-lg p-5 text-left text-white bg-[#1366D9] shadow-md hover:brightness-95 transition">
              <Material name="add_box" className="text-3xl mb-3" />
              <span className="block font-semibold">Ingresar</span>
              <span className="text-white/80 text-sm">Registrar stock</span>
            </button>
            <button onClick={() => navigate("/admin/inventory")} className="rounded-lg p-5 text-left text-white bg-[#6E5AE0] shadow-md hover:brightness-95 transition">
              <Material name="inventory_2" className="text-3xl mb-3" />
              <span className="block font-semibold">Ver Inventory</span>
              <span className="text-white/80 text-sm">Lista de productos</span>
            </button>
          </div>
        </main>
        <MobileNav activo="dashboard" />
      </div>
    </div>
  );
}

function Banda({ etiqueta, valor, color, total }) {
  const pct = total ? Math.round(((valor || 0) / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#1B2430] font-medium">{etiqueta}</span>
        <span className="text-[#667085]">{fmtN(valor || 0)} · {pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#F0F1F3] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Categorias({ cat }) {
  const PALETA = ["#1366D9", "#0ACF83", "#6E5AE0", "#F79009", "#DA3E33", "#009ED8"];
  const ordenadas = [...cat].sort((a, b) => b.unidades - a.unidades).slice(0, 6);
  if (ordenadas.length === 0) return <p className="text-[#667085] text-sm">Sin datos.</p>;
  const max = Math.max(1, ...ordenadas.map((c) => c.unidades));
  return (
    <div className="flex items-end gap-3 h-36">
      {ordenadas.map((c, i) => {
        const h = (c.unidades / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] text-[#667085]">{fmtN(c.unidades)}</span>
            <div className="w-full rounded-t-md" style={{ height: `${h}%`, backgroundColor: PALETA[i % PALETA.length] }} />
            <span className="text-[9px] text-[#667085] truncate w-full text-center">{c.categoria}</span>
          </div>
        );
      })}
    </div>
  );
}
