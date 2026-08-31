// Acceso a Google Sheets desde Cloudflare Worker.
// Reutiliza la lógica de negocio del server Express pero la capa de datos usa fetch + access token.

import { getAccessToken } from "./googleAuth.js";

const DEFAULT_TTL = 5 * 60 * 1000;
let SHEET_MAESTRO = "Maestro_de_Articulos";
let SHEET_INVENTARIO = "Inventario_fisico";
let SHEET_CONSOLIDACION = "Consolidacion";

// Configura las variables desde el entorno del Worker (env). Se llama en el handler.
export function configureWorkerEnv(env) {
  if (env) {
    SPREADSHEET_ID = env.SPREADSHEET_ID || SPREADSHEET_ID;
    globalThis.SPREADSHEET_ID = env.SPREADSHEET_ID || globalThis.SPREADSHEET_ID;
    SHEET_MAESTRO = env.SHEET_MAESTRO || SHEET_MAESTRO;
    SHEET_INVENTARIO = env.SHEET_INVENTARIO || SHEET_INVENTARIO;
    SHEET_CONSOLIDACION = env.SHEET_CONSOLIDACION || SHEET_CONSOLIDACION;
    if (env.GOOGLE_SERVICE_ACCOUNT_JSON) globalThis.GOOGLE_SERVICE_ACCOUNT_JSON = env.GOOGLE_SERVICE_ACCOUNT_JSON;
    TTL_MS = Number(env.CACHE_TTL_SECONDS || 300) * 1000;
  }
}

let SPREADSHEET_ID = globalThis.SPREADSHEET_ID || "";
let TTL_MS = DEFAULT_TTL;

let cache = {
  maestro: null,
  inventario: null,
  consolidacion: null,
  maestroAt: 0,
  inventarioAt: 0,
  consolidacionAt: 0,
};

// Lee el JSON de la service account desde el secreto de Cloudflare.
function getCredsJson() {
  const raw = globalThis.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_JSON (secreto de Cloudflare)");
  return JSON.parse(raw);
}

async function readRange(sheetName, range) {
  const token = await getAccessToken(getCredsJson());
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    SPREADSHEET_ID
  )}/values/${encodeURIComponent(`${sheetName}!${range}`)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google Sheets ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.values || [];
}

function isStale(key) {
  const at = cache[`${key}At`];
  return !cache[key] || Date.now() - at > TTL_MS;
}

function rowsToObjects(rows) {
  if (!rows || rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? String(row[i]).trim() : "";
    });
    return obj;
  });
}

function parseNum(v) {
  if (v === "" || v == null) return null;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseBool(v) {
  const s = String(v || "").trim().toLowerCase();
  if (["si", "sí", "yes", "true", "1"].includes(s)) return true;
  if (["no", "false", "0", ""].includes(s)) return false;
  return null;
}

function impuestoEsGravado(imp) {
  const s = String(imp || "").toLowerCase();
  if (s.includes("exento")) return false;
  if (s.includes("debito") || s.includes("credito") || s.includes("gravado")) return true;
  return null;
}

function normalizeArticulo(raw) {
  const costo = parseNum(raw["Costo"]);
  const precio = parseNum(raw["Precio"]);
  const precioEspecial = parseNum(raw["Precio_Especial"]);
  const precioVigente = precioEspecial && precioEspecial > 0 ? precioEspecial : precio;
  return {
    codigo_articulo: raw["Codigo_articulo"],
    descripcion: raw["Descripcion"] || raw["Descripcion "],
    codigo_barras: raw["Codigo_barras"],
    stock: parseInt(raw["Stock"], 10) || 0,
    categoria: raw["Categoria"],
    subcategoria: raw["Subcategoria"],
    lineas: raw["Lineas"],
    proveedor: raw["Proveedor"],
    marcas: raw["Marcas"],
    consignacion: parseBool(raw["Consignacion"]),
    articulo_compra: parseBool(raw["Articulo_compra"]),
    pareto: parseBool(raw["Pareto"]),
    impuestos: raw["Indicador de impuestos"],
    costo,
    precio,
    precio_especial: precioEspecial,
    precio_vigente: precioVigente,
    gravado: impuestoEsGravado(raw["Indicador de impuestos"]),
  };
}

async function loadMaestro() {
  if (!isStale("maestro")) return cache.maestro;
  const rows = await readRange(SHEET_MAESTRO, "A:P");
  const raw = rowsToObjects(rows);
  const objs = [];
  const byBarcode = new Map();
  const byCode = new Map();
  for (const o of raw) {
    const rec = normalizeArticulo(o);
    objs.push(rec);
    if (rec.codigo_articulo) byCode.set(rec.codigo_articulo, rec);
    if (rec.codigo_barras) byBarcode.set(rec.codigo_barras, rec);
  }
  cache.maestro = { objs, byBarcode, byCode };
  cache.maestroAt = Date.now();
  return cache.maestro;
}

async function loadInventario() {
  if (!isStale("inventario")) return cache.inventario;
  const rows = await readRange(SHEET_INVENTARIO, "A:J");
  cache.inventario = rowsToObjects(rows);
  cache.inventarioAt = Date.now();
  return cache.inventario;
}

async function loadConsolidacion() {
  if (!isStale("consolidacion")) return cache.consolidacion;
  const rows = await readRange(SHEET_CONSOLIDACION, "A:L");
  cache.consolidacion = rowsToObjects(rows);
  cache.consolidacionAt = Date.now();
  return cache.consolidacion;
}

function parseFecha(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  return new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

async function getDetalleConLotes(codigoArticulo) {
  const maestro = await loadMaestro();
  const inv = await loadInventario();
  const articulo = maestro.byCode.get(String(codigoArticulo).trim());
  if (!articulo) return null;
  const tomas = inv.filter(
    (t) => String(t["Codigo_Articulo"]).trim() === String(codigoArticulo).trim()
  );
  const porLote = new Map();
  for (const t of tomas) {
    const lote = t["Lote"] || "Sin lote";
    const key = `${lote}||${t["Fecha_Vencimiento"] || ""}`;
    const g = porLote.get(key) || {
      lote,
      fecha_vencimiento: t["Fecha_Vencimiento"],
      ubicacion: t["Ubicacion"],
      cantidad: 0,
    };
    g.cantidad += parseInt(t["Cantidad"], 10) || 0;
    porLote.set(key, g);
  }
  const lotes = [...porLote.values()];
  const totalContado = lotes.reduce((a, b) => a + b.cantidad, 0);
  return {
    ...articulo,
    lotes,
    total_contado: totalContado,
    diferencia: totalContado - articulo.stock,
  };
}

export async function detallePorCodigo(codigoArticulo) {
  return getDetalleConLotes(codigoArticulo);
}

export async function buscarConLotes(term) {
  const maestro = await loadMaestro();
  let articulo = maestro.byBarcode.get(String(term).trim());
  if (!articulo) articulo = maestro.byCode.get(String(term).trim());
  if (!articulo) return null;
  return getDetalleConLotes(articulo.codigo_articulo);
}

export async function getKPIs() {
  const maestro = await loadMaestro();
  const inv = await loadInventario();
  const objs = maestro.objs;

  const stockPorCategoria = new Map();
  const valorPorCategoria = new Map();
  let totalCritico = 0;
  let totalBajo = 0;
  let totalNormal = 0;
  let totalExento = 0;
  let totalGravado = 0;
  let totalArticulos = objs.length;
  let totalUnidades = 0;
  let totalValor = 0;

  const UMBRAL_CRITICO = 10;
  const UMBRAL_BAJO = 25;

  for (const a of objs) {
    const stock = a.stock || 0;
    const costo = a.costo || 0;
    const cat = a.categoria || "SIN CATEGORIA";

    stockPorCategoria.set(cat, (stockPorCategoria.get(cat) || 0) + stock);
    valorPorCategoria.set(cat, (valorPorCategoria.get(cat) || 0) + stock * costo);
    totalUnidades += stock;
    totalValor += stock * costo;

    if (stock <= UMBRAL_CRITICO) totalCritico++;
    else if (stock <= UMBRAL_BAJO) totalBajo++;
    else totalNormal++;

    if (a.gravado === false) totalExento++;
    else if (a.gravado === true) totalGravado++;
  }

  const hoy = new Date();
  const en3 = new Date(hoy.getFullYear(), hoy.getMonth() + 3, hoy.getDate());
  const en6 = new Date(hoy.getFullYear(), hoy.getMonth() + 6, hoy.getDate());
  let venc3 = 0;
  let venc6 = 0;
  let vencLejanos = 0;
  let totalTomas = 0;

  for (const t of inv) {
    const f = parseFecha(t["Fecha_Vencimiento"]);
    if (!f) continue;
    totalTomas++;
    const cantidad = parseInt(t["Cantidad"], 10) || 0;
    if (f.getFullYear() >= 2900) {
      vencLejanos += cantidad;
    } else if (f <= en3) {
      venc3 += cantidad;
    } else if (f <= en6) {
      venc6 += cantidad;
    } else {
      vencLejanos += cantidad;
    }
  }

  return {
    stock_por_categoria: [...stockPorCategoria.entries()].map(([k, v]) => ({
      categoria: k,
      unidades: v,
    })),
    valor_por_categoria: [...valorPorCategoria.entries()].map(([k, v]) => ({
      categoria: k,
      valor: Math.round(v * 100) / 100,
    })),
    stock_critico: { critico: totalCritico, bajo: totalBajo, normal: totalNormal },
    impuestos: { exento: totalExento, gravado: totalGravado, sin_definir: objs.length - totalExento - totalGravado },
    vencimientos: { en_3m: venc3, en_6m: venc6, lejanos: vencLejanos, total_tomas: totalTomas },
    totales: {
      total_articulos: totalArticulos,
      total_unidades: totalUnidades,
      valor_inventario: Math.round(totalValor * 100) / 100,
    },
    umbrales: { critico: UMBRAL_CRITICO, bajo: UMBRAL_BAJO },
  };
}

export function resetCache() {
  cache = {
    maestro: null,
    inventario: null,
    consolidacion: null,
    maestroAt: 0,
    inventarioAt: 0,
    consolidacionAt: 0,
  };
}
