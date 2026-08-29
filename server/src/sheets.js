import { google } from "googleapis";
import { readFileSync } from "node:fs";

/**
 * Módulo de acceso a Google Sheets mediante Service Account.
 *
 * Configuración (variables de entorno):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  -> JSON completo de la service account embebido (ideal Render)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL -> correo de la service account
 *   GOOGLE_PRIVATE_KEY           -> clave privada (con saltos de línea \n)
 *   GOOGLE_SERVICE_ACCOUNT_FILE  -> (dev) ruta local al JSON de credenciales descargado
 *   SPREADSHEET_ID               -> ID del Google Sheet (de la URL)
 *   SHEET_MAESTRO                -> nombre de la pestaña del maestro (default Maestro_de_Articulos)
 *   SHEET_INVENTARIO             -> nombre de la pestaña de tomas (default Inventario_fisico)
 *   SHEET_CONSOLIDACION          -> nombre de la pestaña de resumen (default Consolidacion)
 *
 * Caché: se mantiene el maestro completo en memoria y se invalida cada TTL (5 min por
 * defecto). El look-up por código de barras es O(1) sobre un Map, así cada escaneo es
 * instantáneo sin volver a tocar Google Sheets.
 */

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_MAESTRO = process.env.SHEET_MAESTRO || "Maestro_de_Articulos";
const SHEET_INVENTARIO = process.env.SHEET_INVENTARIO || "Inventario_fisico";
const SHEET_CONSOLIDACION = process.env.SHEET_CONSOLIDACION || "Consolidacion";
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000);

let sheetsClient = null;
let cache = {
  maestro: null,
  inventario: null,
  consolidacion: null,
  maestroAt: 0,
  inventarioAt: 0,
  consolidacionAt: 0,
};

function buildAuth() {
  // Método A: JSON completo embebido en variable de entorno (ideal para Render/cloud)
  // GOOGLE_SERVICE_ACCOUNT_JSON contiene el contenido del archivo JSON de la service account.
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  }
  // Método B: ruta a archivo JSON local (dev). No compatible con deploys efímeros.
  if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    const creds = JSON.parse(readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8"));
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  }
  // Método C: correo + clave privada por separado.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function getSheets() {
  if (sheetsClient) return sheetsClient;
  const auth = buildAuth();
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export async function resetCache() {
  cache = {
    maestro: null,
    inventario: null,
    consolidacion: null,
    maestroAt: 0,
    inventarioAt: 0,
    consolidacionAt: 0,
  };
}

function isStale(key) {
  const at = cache[`${key}At`];
  return !cache[key] || Date.now() - at > CACHE_TTL_MS;
}

async function readRange(sheetName, range) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return res.data.values || [];
}

export async function debugEncabezados() {
  const rows = await readRange(SHEET_MAESTRO, "A1:P1");
  const inventario = await readRange(SHEET_INVENTARIO, "A1:J1");
  const consolidacion = await readRange(SHEET_CONSOLIDACION, "A1:L1");
  return {
    maestro: rows[0] || [],
    inventario: inventario[0] || [],
    consolidacion: consolidacion[0] || [],
  };
}

export async function debugMaestro() {
  const rows = await readRange(SHEET_MAESTRO, "A2:P5");
  return rows;
}

export async function debugObjs() {
  const { objs } = await loadMaestro();
  return {
    total: objs.length,
    primero: objs[0],
    claves: objs[0] ? Object.keys(objs[0]) : [],
    categoriasUnicas: [...new Set(objs.map((o) => o.categoria))],
  };
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

/**
 * Lee el maestro completo. Devuelve un Map por Codigo_barras y por Codigo_articulo
 * para look-ups O(1).
 */
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

function parseNum(v) {
  if (v === "" || v == null) return null;
  // Soporta "4,61" (coma decimal) y "4.61"
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

function impuestoEsGravado(imp) {
  const s = String(imp || "").toLowerCase();
  if (s.includes("exento")) return false;
  if (s.includes("debito") || s.includes("credito") || s.includes("gravado")) return true;
  return null;
}

/**
 * Lee las tomas del inventario físico (registros de escaneo). Devuelve array de objetos.
 */
async function loadInventario() {
  if (!isStale("inventario")) return cache.inventario;
  const rows = await readRange(SHEET_INVENTARIO, "A:J");
  cache.inventario = rowsToObjects(rows);
  cache.inventarioAt = Date.now();
  return cache.inventario;
}

/**
 * Lee la hoja de consolidación (resumen por artículo con lotes/válidos).
 */
async function loadConsolidacion() {
  if (!isStale("consolidacion")) return cache.consolidacion;
  const rows = await readRange(SHEET_CONSOLIDACION, "A:L");
  cache.consolidacion = rowsToObjects(rows);
  cache.consolidacionAt = Date.now();
  return cache.consolidacion;
}

/**
 * Agrupa las tomas del inventario físico por artículo y sumariza por lote/fecha.
 */
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

/**
 * Endpoint helper para detalle con lotes (usado por /api/articulo/:codigo).
 */
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

/**
 * Parseo flexible de fecha "D/M/YYYY" o "D/M/YY".
 */
function parseFecha(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  return new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

/**
 * Agregados para los dashboards:
 *  - stock_por_categoria : [{ categoria, unidades }]  (suma de Stock)
 *  - stock_critico       : { critico, bajo, normal }  (conteo de artículos)
 *  - impuestos           : { exento, gravado }        (conteo de artículos)
 *  - valor_por_categoria : [{ categoria, valor }]     (suma Stock*Costo)
 *  - vencimientos        : { en_3m, en_6m, lejanos }  (sobre lotes reales del inventario)
 *  - totales             : total articulos, total unidades, valor inventario
 */
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

  // Vencimientos sobre lotes reales del inventario físico.
  // Excluye fechas "sin lote" (2999) y vencimientos fuera de rango.
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
      vencLejanos += cantidad; // "sin lote" / lejanos
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
