// Servicio de datos de operaciones (FASE 2).
//
// Define el CONTRATO de escritura de Tu Auditor. HOY el backend lee solo de
// Google Sheets (read-only) y el Postgres multi-tenant aún no está disponible.
// Por eso estas funciones quedan como contrato definido (mismos nombres, params
// y forma de respuesta que usará Postgres) pero con una implementación
// transitoria que no descarta ni rompe nada:
//   - si el Worker ya expone el endpoint, se usa (apiFetch);
//   - si no, opera sobre un registro efímero en localStorage.
// Al llegar Postgres solo cambia esta capa por el transporte real.
//
// Nota: el módulo de VENTA se eliminó (no se integró con el sistema de cobro/
// factura fiscal del cajero). Aquí solo queda INGRESO/ajuste de inventario.

import { apiFetch } from "../api.js";

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
  return `I-${new Date().toISOString().slice(0, 10)}-${String(++ticketSeq).padStart(4, "0")}`;
}

/**
 * Registra un ingreso (suma stock).
 * @param {{items: Array<{codigo:string, descripcion:string, cantidad:number}>}} ingreso
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
  store.tickets.unshift({ ticket, fecha: new Date().toISOString(), items, tipo: "ingreso" });
  guardarLocal(store);
  return { ok: true, ticket };
}

/** Historia de ingresos de la sesión (transitorio). */
export async function historialOps() {
  const store = cargarLocal();
  return store.tickets || [];
}
