// Servicio de datos de operaciones (FASE 2).
//
// Define el CONTRATO de escritura de Tu Auditor: registrar ventas, ajustar stock.
// HOY el backend lee solo de Google Sheets (read-only) y el Postgres multi-tenant
// aún no está disponible. Por eso estas funciones quedan como contrato definido
// (mismos nombres, params y forma de respuesta que usará Postgres) pero con una
// implementación transitoria que no descarta ni rompe nada:
//   - si el Worker ya expone el endpoint, se usa (apiFetch);
//   - si no, opera sobre un carrito efímero en memoria del navegador y devuelve
//     el ticket local. Al llegar Postgres solo cambia esta capa por el transporte real.
//
// Por eso la UI (página Venta/Ingreso) se construye contra ESTE contrato y no
// depende de si la escritura es real o transitoria.

import { apiFetch } from "../api.js";

// Estado efímero del carrito en esta sesión (transitorio hasta que Postgres persista).
const TIENDA_LOCAL = "tu-auditor:ops:v1";
let ticketSeq = 0;

function cargarLocal() {
  try {
    return JSON.parse(localStorage.getItem(TIENDA_LOCAL) || "{}");
  } catch (_) {
    return {};
  }
}
function guardarLocal(d) {
  try {
    localStorage.setItem(TIENDA_LOCAL, JSON.stringify(d));
  } catch (_) {
    /* sin persistencia local: no crítico */
  }
}

function uid() {
  return `T-${new Date().toISOString().slice(0, 10)}-${String(++ticketSeq).padStart(4, "0")}`;
}

/**
 * Registra una venta.
 * @param {{items: Array<{codigo_articulo:string, descripcion:string, precio:number, cantidad:number}>}} venta
 * @param {object} [pay] opciones de pago (opcional)
 * @returns {Promise<{ok:boolean, ticket?:string, error?:string}>}
 */
export async function registrarVenta(venta, pay = {}) {
  const items = (venta.items || []).filter((i) => i && i.cantidad > 0);
  if (items.length === 0) return { ok: false, error: "carrito_vacio" };

  const total = items.reduce((a, i) => a + (Number(i.precio) || 0) * i.cantidad, 0);

  try {
    const res = await apiFetch("/ops/venta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, total, pay }),
    });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      return { ok: true, ticket: d.ticket || uid() };
    }
  } catch (_) {
    /* sin back: cae a transitorio local */
  }

  // Transitorio local: registra el ticket en localStorage (se reemplaza por Postgres).
  const store = cargarLocal();
  const ticket = uid();
  store.tickets = store.tickets || [];
  store.tickets.unshift({ ticket, fecha: new Date().toISOString(), items, total, venta: true });
  guardarLocal(store);

  return { ok: true, ticket };
}

/**
 * Registra un ingreso (suma stock).
 * @returns {Promise<{ok:boolean, ticket?:string, error?:string}>}
 */
export async function registrarIngreso(ingreso) {
  const items = (ingreso.items || []).filter((i) => i && i.cantidad > 0);
  if (items.length === 0) return { ok: false, error: "vacio" };

  try {
    const res = await apiFetch("/ops/ingreso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      return { ok: true, ticket: d.ticket || uid() };
    }
  } catch (_) {
    /* transitorio */
  }

  const store = cargarLocal();
  const ticket = uid();
  store.tickets = store.tickets || [];
  store.tickets.unshift({ ticket, fecha: new Date().toISOString(), items, venta: false });
  guardarLocal(store);
  return { ok: true, ticket };
}

/** Historia de operaciones de la sesión (transitorio). */
export async function historialOps() {
  const store = cargarLocal();
  return store.tickets || [];
}
