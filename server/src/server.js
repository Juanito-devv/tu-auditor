import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buscarConLotes,
  debugEncabezados,
  debugMaestro,
  debugObjs,
  detallePorCodigo,
  getKPIs,
  resetCache,
} from "./sheets.js";

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === "production";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "../../client/dist");

app.use(cors());
app.use(express.json());

// Ruta raíz - estado del servicio (solo en desarrollo)
if (!isProd) {
  app.get("/", (_req, res) => {
    res.json({ ok: true, servicio: "inventario-api", version: "1.0.0" });
  });
}

// Búsqueda por código de barras o código de artículo. Devuelve detalle con lotes.
app.get("/api/articulo/:term", async (req, res) => {
  try {
    const art = await buscarConLotes(req.params.term);
    if (!art) return res.status(404).json({ error: "producto_no_encontrado" });
    res.json(art);
  } catch (e) {
    console.error("Error en /api/articulo", e);
    res.status(500).json({ error: "error_interno", detalle: e.message });
  }
});

// Detalle por código de artículo exacto (con lotes)
app.get("/api/articulo/codigo/:codigo", async (req, res) => {
  try {
    const art = await detallePorCodigo(req.params.codigo);
    if (!art) return res.status(404).json({ error: "producto_no_encontrado" });
    res.json(art);
  } catch (e) {
    console.error("Error en /api/articulo/codigo", e);
    res.status(500).json({ error: "error_interno", detalle: e.message });
  }
});

// Diagnóstico (solo en desarrollo/entornos no productivos)
if (!isProd) {
  // Diagnóstico: encabezados reales de las pestañas
  app.get("/api/debug/headers", async (_req, res) => {
    try {
      res.json(await debugEncabezados());
    } catch (e) {
      res.status(500).json({ error: "error_interno", detalle: e.message });
    }
  });

  // Diagnóstico: primeras filas crudas del maestro
  app.get("/api/debug/maestro", async (_req, res) => {
    try {
      res.json(await debugMaestro());
    } catch (e) {
      res.status(500).json({ error: "error_interno", detalle: e.message });
    }
  });

  // Diagnóstico: primer objeto normalizado
  app.get("/api/debug/objs", async (_req, res) => {
    try {
      res.json(await debugObjs());
    } catch (e) {
      res.status(500).json({ error: "error_interno", detalle: e.message });
    }
  });
}

// KPIs y agregados para dashboards (tortas + métricas)
app.get("/api/kpis", async (_req, res) => {
  try {
    const kpis = await getKPIs();
    res.json(kpis);
  } catch (e) {
    console.error("Error en /api/kpis", e);
    res.status(500).json({ error: "error_interno", detalle: e.message });
  }
});

// Forzar recarga de la caché (útil tras editar la hoja)
app.post("/api/cache/reload", async (_req, res) => {
  resetCache();
  res.json({ ok: true, mensaje: "Caché recargada" });
});

// Health check (usado por Render y monitoreo)
app.get("/api/", (_req, res) => {
  res.json({ ok: true, servicio: "tu-auditor", tiempo: new Date().toISOString() });
});

// Servir el frontend construido en producción (SPA con fallback a index.html)
if (isProd && (await fsExists(DIST_DIR))) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Inventario API escuchando en http://localhost:${PORT}`);
});

import { access } from "node:fs/promises";
async function fsExists(p) {
  try {
    await access(p);
    return true;
  } catch (_) {
    return false;
  }
}
