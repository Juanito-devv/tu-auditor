// Cloudflare Worker - API de Tu Auditor (enrutamiento + handlers)
// El mismo API que el server Express, pero en serverless.

import {
  buscarConLotes,
  detallePorCodigo,
  getKPIs,
  listArticulos,
  resetCache,
  configureWorkerEnv,
} from "./sheets.js";

const ORIGENES_PERMITIDOS = [
  "https://tu-auditor-front.juanitoira1998.workers.dev",
  "https://juanitoira1998.workers.dev",
  "http://localhost:5173",
  "http://localhost:5174",
];

// CORS restringido: refleja el Origin solo si está en lista blanca.
function corsFor(request) {
  const origin = request.headers.get("Origin");
  if (origin && ORIGENES_PERMITIDOS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }
  return {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function wrap(fn) {
  return async (request) => {
    const cors = corsFor(request);
    try {
      return await fn(request);
    } catch (e) {
      console.error("Error del worker:", e);
      return json({ error: "error_interno", detalle: e.message }, 500, cors);
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    configureWorkerEnv(env);
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = corsFor(request);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check
    if (path === "/api/" || path === "/") {
      return json({ ok: true, servicio: "tu-auditor-api", tiempo: new Date().toISOString() });
    }

    if (path === "/api/kpis") {
      return wrap(async () => json(await getKPIs(), 200, cors))(request);
    }

    if (path === "/api/articulos") {
      return wrap(async () => {
        const url = new URL(request.url);
        const page = url.searchParams.get("page") || "1";
        const limit = url.searchParams.get("limit") || "50";
        const q = url.searchParams.get("q") || "";
        return json(await listArticulos({ page, limit, q }), 200, cors);
      })(request);
    }

    const codigoMatch = path.match(/^\/api\/articulo\/codigo\/(.+)$/);
    if (codigoMatch) {
      return wrap(async () => {
        const codigo = decodeURIComponent(codigoMatch[1]);
        const art = await detallePorCodigo(codigo);
        if (!art) return json({ error: "producto_no_encontrado" }, 404, cors);
        return json(art, 200, cors);
      })(request);
    }

    const articuloMatch = path.match(/^\/api\/articulo\/(.+)$/);
    if (articuloMatch) {
      return wrap(async () => {
        const term = decodeURIComponent(articuloMatch[1]);
        const art = await buscarConLotes(term);
        if (!art) return json({ error: "producto_no_encontrado" }, 404, cors);
        return json(art, 200, cors);
      })(request);
    }

    if (path === "/api/cache/reload" && request.method === "POST") {
      resetCache();
      return json({ ok: true, mensaje: "Caché recargada" }, 200, cors);
    }

    return json({ error: "no_encontrado" }, 404, cors);
  },
};