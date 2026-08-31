// Base URL de la API.
// - En producción (Cloudflare Pages): VITE_API_URL apunta al Worker (ej https://tu-auditor-api.<sub>.workers.dev)
// - En desarrollo: ruta relativa "/api" que el proxy de Vite reenvía a localhost:4000.
// Si VITE_API_URL no está definida y no es dev, asume que la API está en el mismo origen bajo /api.
const API_BASE =
  import.meta.env.VITE_API_URL || `/${import.meta.env.BASE_URL || ""}api`;

export function apiFetch(path, options) {
  return fetch(`${API_BASE}${path}`, options);
}
