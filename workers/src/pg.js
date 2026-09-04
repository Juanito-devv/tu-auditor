// Acceso a PostgreSQL (Neon) desde Cloudflare Worker.
// Reemplaza a sheets.js como fuente de datos: MISMO contrato de funciones
// exportadas (getKPIs, buscarConLotes, detallePorCodigo, listArticulos,
// resetCache, configureWorkerEnv) y MISMA lógica de cálculo, pero los datos
// se leen de la tabla multi-tenant de Neon (articulos, tomas_inventario).
//
// Conexión: @neondatabase/serverless (HTTP/WebSocket, sin bloqueo TCP) usando
// el secret DATABASE_URL. Requiere compatibility_flags = ["nodejs_compat"].

import { Pool } from "@neondatabase/serverless";

const DEFAULT_TTL = 5 * 60 * 1000;

let DATABASE_URL = "";
let TENANT_ID = "";
let TTL_MS = DEFAULT_TTL;

export function configureWorkerEnv(env) {
  if (env) {
    if (env.DATABASE_URL) DATABASE_URL = env.DATABASE_URL;
    TENANT_ID = env.TENANT_ID_DEMO || TENANT_ID;
    TTL_MS = Number(env.CACHE_TTL_SECONDS || 300) * 1000;
  }
}

let cache = { maestro: null, inventario: null, maestroAt: 0, inventarioAt: 0 };

function isStale(key) {
  const at = cache[`${key}At`];
  return !cache[key] || Date.now() - at > TTL_MS;
}

function newPool() {
  return new Pool({ connectionString: DATABASE_URL });
}

// Tasa BCV (Bs por USD) consultada a DolarAPI (fuente "oficial" = BCV).
// Se cachea 12h porque el BCV publica 1 vez al día. Devuelve número o null si falla.
let tasaBcvCache = { valor: null, at: 0 };
const TASA_BCV_TTL = 12 * 60 * 60 * 1000;
const TASA_BCV_URL = "https://ve.dolarapi.com/v1/dolares/oficial";

export async function getTasaBcv() {
  if (tasaBcvCache.valor != null && Date.now() - tasaBcvCache.at < TASA_BCV_TTL) {
    return tasaBcvCache.valor;
  }
  try {
    const res = await fetch(TASA_BCV_URL, {
      headers: { "accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("http " + res.status);
    const d = await res.json();
    const tasa = Number(d.promedio);
    if (tasa && tasa > 0) {
      tasaBcvCache = { valor: tasa, at: Date.now() };
      return tasa;
    }
    throw new Error("sin promedio");
  } catch (_) {
    // Si expiró pero tenemos un valor previo, lo seguimos usando como fallback.
    if (tasaBcvCache.valor != null) return tasaBcvCache.valor;
    return null;
  }
}

// Convierte una fila de la tabla `articulos` al mismo objeto JS que producía
// normalizeArticulo() desde el sheet (mismas keys que consume la UI/lógica).
function rowToArticulo(r) {
  const precioEspecial = r.precio_especial == null ? null : Number(r.precio_especial);
  const precio = r.precio == null ? null : Number(r.precio);
  const precioVigente =
    precioEspecial && precioEspecial > 0 ? precioEspecial : precio;
  return {
    id: r.id,
    articulo_id: r.id,
    codigo_articulo: r.codigo_articulo,
    descripcion: r.descripcion,
    codigo_barras: r.codigo_barras,
    stock: r.stock || 0,
    categoria: r.categoria,
    subcategoria: r.subcategoria,
    lineas: r.lineas,
    proveedor: r.proveedor,
    marcas: r.marcas,
    consignacion: r.consignacion,
    articulo_compra: r.articulo_compra,
    pareto: r.pareto,
    impuestos: r.impuestos,
    costo: r.costo == null ? null : Number(r.costo),
    precio,
    precio_especial: precioEspecial,
    precio_vigente: precioVigente,
    gravado: r.gravado,
  };
}

// Fecha date/ISO de Postgres -> "dd/mm/yyyy" (formato que consume la lógica).
function dbFechaToDiaMesAnio(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Convierte una fila de `tomas_inventario` al objeto con las keys esperadas.
function rowToToma(r) {
  return {
    Codigo_Articulo: r.codigo_articulo,
    Lote: r.lote || "",
    Fecha_Vencimiento: dbFechaToDiaMesAnio(r.fecha_vencimiento) || "",
    Ubicacion: r.ubicacion || "",
    Cantidad: r.cantidad || 0,
    Dispositivo: r.quien || "",
  };
}

async function loadMaestro() {
  if (!isStale("maestro")) return cache.maestro;
  const pool = newPool();
  const objs = [];
  const byBarcode = new Map();
  const byCode = new Map();
  try {
    const res = await pool.query(
      "SELECT * FROM articulos WHERE tenant_id = $1",
      [TENANT_ID]
    );
    for (const row of res.rows) {
      const rec = rowToArticulo(row);
      objs.push(rec);
      if (rec.codigo_articulo) byCode.set(rec.codigo_articulo, rec);
      if (rec.codigo_barras) byBarcode.set(rec.codigo_barras, rec);
    }
  } finally {
    await pool.end();
  }
  cache.maestro = { objs, byBarcode, byCode };
  cache.maestroAt = Date.now();
  return cache.maestro;
}

async function loadInventario() {
  if (!isStale("inventario")) return cache.inventario;
  const pool = newPool();
  let rows = [];
  try {
    const res = await pool.query(
      "SELECT * FROM tomas_inventario WHERE tenant_id = $1",
      [TENANT_ID]
    );
    rows = res.rows.map(rowToToma);
  } finally {
    await pool.end();
  }
  cache.inventario = rows;
  cache.inventarioAt = Date.now();
  return cache.inventario;
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

// Lista paginada del maestro para la vista admin (Inventory).
// devuelve { total, page, limit, articulos: [...] }
export async function listArticulos({ page = 1, limit = 50, q = "" } = {}) {
  const maestro = await loadMaestro();
  const query = String(q || "").trim().toLowerCase();
  let lista = maestro.objs;
  if (query) {
    lista = lista.filter((a) => {
      const d = (a.descripcion || "").toLowerCase();
      const b = (a.codigo_barras || "").toLowerCase();
      const c = (a.codigo_articulo || "").toLowerCase();
      return d.includes(query) || b.includes(query) || c.includes(query);
    });
  }
  const total = lista.length;
  const limitN = Math.max(1, Math.min(Number(limit) || 50, 200));
  const pageN = Math.max(1, Number(page) || 1);
  const start = (pageN - 1) * limitN;
  const slice = lista.slice(start, start + limitN).map((a) => ({
    codigo_articulo: a.codigo_articulo,
    codigo_barras: a.codigo_barras,
    descripcion: a.descripcion,
    categoria: a.categoria,
    proveedor: a.proveedor,
    stock: a.stock,
    costo: a.costo,
    precio_vigente: a.precio_vigente,
    gravado: a.gravado,
  }));
  return { total, page: pageN, limit: limitN, articulos: slice };
}

// Detalle de vencimientos agrupado por artículo y por bucket (<3m, 3-6m, >6m).
// Agrega por Código_Articulo la cantidad total contada y la clasifica según el
// vencimiento. Devuelve { en_3m: [], en_6m: [], lejanos: [] } (cada item: artículo).
export async function getVencimientosDetalle() {
  const maestro = await loadMaestro();
  const inv = await loadInventario();
  const hoy = new Date();
  const en3 = new Date(hoy.getFullYear(), hoy.getMonth() + 3, hoy.getDate());
  const en6 = new Date(hoy.getFullYear(), hoy.getMonth() + 6, hoy.getDate());

  const porArticulo = new Map();
  for (const t of inv) {
    const cod = String(t["Codigo_Articulo"]).trim();
    const cantidad = parseInt(t["Cantidad"], 10) || 0;
    const f = parseFecha(t["Fecha_Vencimiento"]);
    const bucket = !f || f.getFullYear() >= 2900 ? "lejanos" : f <= en3 ? "en_3m" : f <= en6 ? "en_6m" : "lejanos";
    const g = porArticulo.get(cod) || { total: 0, en_3m: 0, en_6m: 0, lejanos: 0 };
    g.total += cantidad;
    g[bucket] += cantidad;
    porArticulo.set(cod, g);
  }

  const build = (bucket) =>
    [...porArticulo.entries()]
      .filter(([, g]) => g[bucket] > 0)
      .map(([cod, g]) => {
        const a = maestro.byCode.get(cod);
        return {
          codigo_articulo: cod,
          descripcion: a ? a.descripcion : "Sin descripción",
          codigo_barras: a ? a.codigo_barras : "",
          stock: a ? a.stock || 0 : 0,
          cantidad: g[bucket],
          total_contado: g.total,
        };
      })
      .sort((x, y) => y.cantidad - x.cantidad);

  return { en_3m: build("en_3m"), en_6m: build("en_6m"), lejanos: build("lejanos") };
}

export async function getKPIs() {
  const maestro = await loadMaestro();
  const inv = await loadInventario();
  const objs = maestro.objs;
  const tasa_bcv = await getTasaBcv();

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
    tasa_bcv,
  };
}

export function resetCache() {
  cache = { maestro: null, inventario: null, maestroAt: 0, inventarioAt: 0 };
}

// Escritura: registra un ingreso (suma stock / alta si el artículo no existe).
// Se aplica sobre la tabla `articulos` del tenant (no requiere tablas nuevas).
// items: [{ codigo, descripcion, cantidad }]
export async function registrarIngreso({ items = [] }) {
  const validos = items.filter((i) => i && i.codigo && Number(i.cantidad) > 0);
  if (validos.length === 0) return { ok: false, error: "vacio" };
  const pool = newPool();
  const client = await pool.connect();
  let afectados = 0;
  try {
    await client.query("BEGIN");
    for (const it of validos) {
      const cantidad = Math.min(Math.max(Number(it.cantidad) || 0, 0), 100000);
      const codigo = String(it.codigo).trim();
      const up = await client.query(
        `UPDATE articulos
           SET stock = stock + $3, actualizado_el = now()
           WHERE tenant_id = $1 AND codigo_articulo = $2`,
        [TENANT_ID, codigo, cantidad]
      );
      if (up.rowCount === 0) {
        const descripcion = it.descripcion || codigo;
        await client.query(
          `INSERT INTO articulos (tenant_id, codigo_articulo, descripcion, stock)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tenant_id, codigo_articulo) DO UPDATE
             SET stock = articulos.stock + EXCLUDED.stock,
                 actualizado_el = now()`,
          [TENANT_ID, codigo, descripcion, cantidad]
        );
      }
      afectados++;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
  // invalida la caché del maestro para que la suma aparezca de inmediato
  resetCache();
  const ticket = `I-${new Date().toISOString().slice(0, 10)}-${String(Date.now() % 100000).padStart(5, "0")}`;
  return { ok: true, ticket, afectados };
}

// Escritura: registra una toma de inventario (conteo físico) en `tomas_inventario`.
// Requiere que el código de barras exista en el maestro (articulos) para resolver
// articulo_id + codigo_articulo. Hace UPSERT por (tenant, codigo_articulo, lote,
// fecha_vencimiento) sumando la cantidad contada.
// toma: { codigo_barras, lote, fecha_vencimiento, ubicacion, cantidad }
export async function registrarToma({ codigo_barras, lote, fecha_vencimiento, ubicacion, cantidad } = {}) {
  const barcode = String(codigo_barras || "").trim();
  const cant = Math.min(Math.max(Number(cantidad) || 0, 0), 100000);
  if (!barcode || cant <= 0) return { ok: false, error: "vacio" };

  const maestro = await loadMaestro();
  const articulo = maestro.byBarcode.get(barcode);
  if (!articulo) return { ok: false, error: "no_encontrado" };

  const pool = newPool();
  const client = await pool.connect();
  let id = null;
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `INSERT INTO tomas_inventario
         (tenant_id, articulo_id, codigo_articulo, lote, fecha_vencimiento, ubicacion, cantidad, quien)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, codigo_articulo, lote, fecha_vencimiento)
       DO UPDATE SET cantidad = tomas_inventario.cantidad + EXCLUDED.cantidad,
                     ubicacion = EXCLUDED.ubicacion,
                     quien = EXCLUDED.quien,
                     tomada_el = now()
       RETURNING id`,
      [
        TENANT_ID,
        articulo.articulo_id,
        articulo.codigo_articulo,
        lote || "",
        fecha_vencimiento || null,
        ubicacion || "",
        cant,
        "demo",
      ]
    );
    id = res.rows[0] ? res.rows[0].id : null;
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
  resetCache();
  return { ok: true, id, articulo_id: articulo.articulo_id, codigo_articulo: articulo.codigo_articulo };
}

// Vista: crea vista_consolidacion en Neon (idempotente)
export async function ensureConsolidacionView() {
  const pool = newPool();
  try {
    await pool.query(`DROP VIEW IF EXISTS vista_consolidacion`);
    await pool.query(`
      CREATE VIEW vista_consolidacion AS
      SELECT
        t.tenant_id,
        t.codigo_articulo,
        a.codigo_barras AS codigo_barra,
        a.descripcion,
        COUNT(DISTINCT t.lote || '|' || COALESCE(t.fecha_vencimiento::text, '')) AS conteo_lotes,
        COALESCE(SUM(t.cantidad), 0) AS conteo_fecha_vencimiento,
        a.stock,
        (COALESCE(SUM(t.cantidad), 0) - a.stock) AS diferencia,
        CASE
          WHEN (COALESCE(SUM(t.cantidad), 0) - a.stock) = 0 THEN 'completo'
          WHEN (COALESCE(SUM(t.cantidad), 0) - a.stock) < 0 THEN 'faltante'
          ELSE 'sobrante'
        END AS estatus,
        a.costo,
        ((COALESCE(SUM(t.cantidad), 0) - a.stock) * a.costo) AS impacto_financiero
      FROM tomas_inventario t
      JOIN articulos a ON a.tenant_id = t.tenant_id AND a.codigo_articulo = t.codigo_articulo
      GROUP BY t.tenant_id, t.codigo_articulo, a.codigo_barras, a.descripcion, a.stock, a.costo;
    `);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    await pool.end();
  }
}

// Consulta consolidación
export async function getConsolidacion() {
  const pool = newPool();
  try {
    const res = await pool.query(
      `SELECT * FROM vista_consolidacion WHERE tenant_id = $1 ORDER BY ABS(impacto_financiero) DESC`,
      [TENANT_ID]
    );
    const filas = res.rows;

    // Avance de conteo: contados = artículos con >=1 toma (vista) vs con stock = total maestro
    const m = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM articulos WHERE tenant_id = $1 AND stock IS NOT NULL) AS con_stock,
         (SELECT COUNT(*) FROM (SELECT DISTINCT codigo_articulo FROM tomas_inventario WHERE tenant_id = $1) sub) AS contados
       `,
      [TENANT_ID]
    );
    const avance = m.rows[0];

    return { filas, avance };
  } finally {
    await pool.end();
  }
}
