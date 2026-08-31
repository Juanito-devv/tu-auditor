// Base URL de la API.
// - En producción: VITE_API_URL apunta al Worker (ej https://tu-auditor-api.<sub>.workers.dev[/api]).
//   Se normaliza para que la base SIEMPRE termine en /api, así las rutas se resuelven bajo /api/...
// - En desarrollo: ruta relativa "/api" que el proxy de Vite reenvía a localhost:4000.
import.meta.env;
const rawUrl = import.meta.env.VITE_API_URL || "";
function normalizarBase(url) {
  const clean = url.replace(/\/+$/, "");
  return clean ? `${clean}/api` : "/api";
}
const API_BASE = normalizarBase(rawUrl);

export function apiFetch(path, options) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${API_BASE}${p}`, options);
}
