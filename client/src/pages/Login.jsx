import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { iniciarSesion } from "../lib/auth.js";

function Material({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const r = await iniciarSesion(usuario, pass);
    setCargando(false);
    if (r.ok) {
      if (r.sesion.rol === "admin") navigate("/admin");
      else navigate("/inicio");
    } else {
      setError("Credenciales inválidas. Verifica usuario y contraseña.");
    }
  }

  return (
    <div className="landing-kanban min-h-screen bg-[#F0F1F3] flex items-center justify-center p-5">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <span className="relative w-12 h-12" aria-hidden>
            <span className="absolute bottom-0 left-0 w-12 h-12 rounded-[7px] bg-[#009ED8]" />
            <span className="absolute top-0 right-0 w-[33px] h-[33px] bg-[#0ACF83] rounded-md" />
            <span className="absolute top-[9px] right-[4px] w-[19px] h-[19px] bg-white rounded-sm" />
          </span>
          <span className="font-semibold text-[#009ED8] text-xl">AuditApp</span>
        </div>

        <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.08)] p-8">
          <h1 className="text-2xl font-semibold text-[#1B2430] mb-1">Iniciar sesión</h1>
          <p className="text-[#667085] text-sm mb-6">Accede al panel de AuditApp</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2430]" htmlFor="user">Usuario</label>
              <input
                id="user"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="usuario"
                autoComplete="username"
                className="h-12 px-3.5 rounded-lg border border-[#D0D3D9] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1366D9]/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2430]" htmlFor="pass">Contraseña</label>
              <input
                id="pass"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-12 px-3.5 rounded-lg border border-[#D0D3D9] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1366D9]/30"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-[#F4B4AE] bg-[#FDECEA] text-[#7A1D15] text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="mt-1 h-12 rounded-lg bg-[#1366D9] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0f56b6] transition-colors disabled:opacity-60"
            >
              {cargando ? (
                <Material name="progress_activity" className="animate-spin text-lg" />
              ) : (
                <Material name="login" className="text-lg" />
              )}
              Entrar
            </button>
          </form>

          <button
            onClick={() => navigate("/")}
            className="mt-4 w-full text-center text-sm text-[#1366D9] font-medium hover:underline"
          >
            Volver a la portada
          </button>

          <div className="mt-6 pt-5 border-t border-[#F0F1F3] text-center">
            <p className="text-xs text-[#667085]">
              El panel queda disponible para clientes con acceso.
              <span className="block mt-1">Demo de acceso libre en la portada.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
