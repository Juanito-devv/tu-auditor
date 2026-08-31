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
function fmtBs(n) {
  return "Bs " + Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 });
}
function estadoStock(stock) {
  if (stock <= 10) return { texto: "Crítico", cls: "bg-[#FDECEA] text-[#DA3E33]" };
  if (stock <= 25) return { texto: "Bajo", cls: "bg-[#FFF4E5] text-[#E19133]" };
  return { texto: "En Stock", cls: "bg-[#E8F6EE] text-[#10A760]" };
}

export default function InventoryAdmin() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(true);
  const LIMIT = 50;

  useEffect(() => {
    let activo = true;
    setCargando(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (q) params.set("q", q);
    apiFetch(`/articulos?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (activo) setDatos(d); })
      .catch(() => {})
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [page, q]);

  function buscar(e) {
    e.preventDefault();
    setPage(1);
    setQ(input.trim());
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.limit)) : 1;

  return (
    <div className="landing-kanban min-h-screen bg-[#F0F1F3] flex">
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
          <NavBtn onClick={() => navigate("/admin")} icono="dashboard" label="Dashboard" />
          <NavBtn onClick={() => navigate("/admin/inventory")} icono="inventory_2" label="Inventory" activo />
          <NavBtn onClick={() => navigate("/ingreso")} icono="add_box" label="Ingreso" />
          <NavBtn onClick={() => navigate("/admin/reportes")} icono="monitoring" label="Reportes" />
        </nav>
        <div className="p-3">
          <NavBtn onClick={() => { cerrarSesion(); navigate("/login"); }} icono="logout" label="Salir" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E6E8EC] h-[70px] flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="md:hidden text-[#1366D9]" aria-label="Volver">
              <Material name="arrow_back" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#1B2430]">Inventory</h1>
              <p className="text-xs text-[#667085] hidden sm:block">
                {datos ? `${fmtN(datos.total)} productos en el maestro` : "Cargando…"}
              </p>
            </div>
          </div>
          <form onSubmit={buscar} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Buscar producto…"
              className="h-10 px-3 rounded-lg border border-[#D0D3D9] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1366D9]/30 w-44 sm:w-56"
            />
            <button type="submit" className="h-10 px-4 rounded-lg bg-[#1366D9] text-white text-sm font-medium flex items-center gap-1">
              <Material name="search" className="text-base" /> Buscar
            </button>
          </form>
        </header>

        <main className="flex-1 p-5 md:p-6 space-y-4 overflow-y-auto pb-[72px] md:pb-6">
          <div className="rounded-lg border border-[#E4E7EC] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[#667085] border-b border-[#E6E8EC]">
                    <th className="px-5 py-3 font-medium">Producto</th>
                    <th className="px-3 py-3 font-medium">Código</th>
                    <th className="px-3 py-3 font-medium">Precio</th>
                    <th className="px-3 py-3 font-medium">Stock</th>
                    <th className="px-3 py-3 font-medium">Disponibilidad</th>
                    <th className="px-5 py-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan="6" className="px-5 py-10 text-center text-[#667085]">Cargando productos…</td></tr>
                  ) : datos?.articulos?.length === 0 ? (
                    <tr><td colSpan="6" className="px-5 py-10 text-center text-[#667085]">Sin resultados.</td></tr>
                  ) : (
                    datos?.articulos?.map((a, i) => {
                      const est = estadoStock(a.stock);
                      return (
                        <tr key={i} className="border-b border-[#F0F1F3] last:border-0 hover:bg-[#FAFBFC]">
                          <td className="px-5 py-3">
                            <p className="text-[#1B2430] font-medium max-w-[220px] truncate">{a.descripcion}</p>
                            <p className="text-xs text-[#667085]">{a.categoria}</p>
                          </td>
                          <td className="px-3 py-3 text-[#48505E]">{a.codigo_articulo || "—"}</td>
                          <td className="px-3 py-3 text-[#48505E]">{a.precio_vigente ? fmtBs(a.precio_vigente) : "—"}</td>
                          <td className={`px-3 py-3 font-semibold ${a.stock <= 10 ? "text-[#DA3E33]" : a.stock <= 25 ? "text-[#E19133]" : "text-[#1B2430]"}`}>{fmtN(a.stock)}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${est.cls}`}>{est.texto}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => navigate(`/detalle/${encodeURIComponent(a.codigo_articulo)}`)}
                              className="text-[#1366D9] text-sm font-medium hover:underline"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {datos && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#E6E8EC] text-sm text-[#667085]">
                <span>Página {datos.page} de {totalPaginas}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded border border-[#D0D3D9] bg-white disabled:opacity-40"
                  >Anterior</button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                    disabled={page >= totalPaginas}
                    className="px-3 py-1.5 rounded border border-[#D0D3D9] bg-white disabled:opacity-40"
                  >Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
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
