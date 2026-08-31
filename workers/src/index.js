// Cloudflare Worker - API de Tu Auditor (enrutamiento + handlers)
// El mismo API que el server Express, pero en serverless.

import {
  buscarConLotes,
  detallePorCodigo,
  getKPIs,
  resetCache,
  configureWorkerEnv,
} from "./sheets.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function wrap(fn) {
  return (request) =>
    fn(request).catch((e) => {
      console.error("Error del worker:", e);
      return json({ error: "error_interno", detalle: e.message }, 500);
    });
}

export default {
  async fetch(request, env, ctx) {
    configureWorkerEnv(env);
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (path === "/api/" || path === "/") {
      return json({ ok: true, servicio: "tu-auditor-api", tiempo: new Date().toISOString() });
    }

    if (path === "/api/kpis") {
      return wrap(async () => json(await getKPIs()))(request);
    }

    const codigoMatch = path.match(/^\/api\/articulo\/codigo\/(.+)$/);
    if (codigoMatch) {
      return wrap(async () => {
        const codigo = decodeURIComponent(codigoMatch[1]);
        const art = await detallePorCodigo(codigo);
        if (!art) return json({ error: "producto_no_encontrado" }, 404);
        return json(art);
      })(request);
    }

    const articuloMatch = path.match(/^\/api\/articulo\/(.+)$/);
    if (articuloMatch) {
      return wrap(async () => {
        const term = decodeURIComponent(articuloMatch[1]);
        const art = await buscarConLotes(term);
        if (!art) return json({ error: "producto_no_encontrado" }, 404);
        return json(art);
      })(request);
    }

    if (path === "/api/cache/reload" && request.method === "POST") {
      resetCache();
      return json({ ok: true, mensaje: "Caché recargada" });
    }

    return json({ error: "no_encontrado" }, 404);
  },
};
