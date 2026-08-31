// Autenticación y control de acceso (FASE 3).
//
// Modelo:
//   - La app demo es de acceso público (cualquiera entra al escáner desde la
//     landing con "Probar DEMO").
//   - El PANEL administrativo (/admin*) exige sesión (guard RequerirPanel en App.jsx).
//   - Hay un usuario ADMIN para desarrolladores que SIEMPRE entra al panel.
//   - Un cliente que aún NO adquirió el producto (rol "cliente" sin plan) NO
//     entra al panel: solo ve la demo.
//
// HOY la sesión vive en localStorage (persistencia transitoria). Es el MISMO
// contrato que se enchufará a Postgres/tenants cuando llegue: aquí solo se
// valida el rol/sesión, y la UI ya no se toca cuando cambie el transporte.
//
// Formato de sesión:
//   { usuario, rol: 'admin' | 'cliente', plan?: 'demo' | 'pago', autenticado: bool }

const SESION_KEY = "tu-auditor:auth:v1";

// Hash SHA-256 (no el password en claro). Credencial por defecto para
// desarrolladores. En Postgres esto pasará a validate con bcrypt/server.
// usuario: "admin" · contraseña: "tuauditor2026"
const ADMIN_USER = "admin";
const ADMIN_PASS_HASH = "3aa2119267e6c18095765483f55b8bc173d44c25668d3bbf997c7de39f32ffbe";

async function sha256(text) {
  try {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (_) {
    return null;
  }
}

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(SESION_KEY) || "null");
  } catch (_) {
    return null;
  }
}
function guardarSesion(s) {
  try {
    localStorage.setItem(SESION_KEY, JSON.stringify(s));
  } catch (_) {
    /* sin persistencia: no crítico */
  }
}

/** Determina si la sesión actual puede ver el panel administrativo. */
export function puedeAccederPanel() {
  const s = leerSesion();
  return !!(s && s.autenticado && s.rol === "admin");
}

/** Sesión actual o null. */
export function sesionActual() {
  return leerSesion();
}

/** Autentica con credenciales. Devuelve {ok, sesion?, error?}. */
export async function iniciarSesion(usuario, contraseña) {
  const u = String(usuario || "").trim().toLowerCase();
  const pass = String(contraseña || "");

  if (u === ADMIN_USER) {
    const hash = await sha256(pass);
    if (hash === ADMIN_PASS_HASH) {
      const s = { usuario: ADMIN_USER, rol: "admin", plan: "pago", autenticado: true };
      guardarSesion(s);
      return { ok: true, sesion: s };
    }
    return { ok: false, error: "credenciales_invalidas" };
  }

  // Cualquier otro usuario = cliente potencial. Sin plan aún, no entra al panel.
  if (u && pass) {
    const s = { usuario: u, rol: "cliente", plan: "demo", autenticado: true };
    guardarSesion(s);
    return { ok: true, sesion: s };
  }

  return { ok: false, error: "credenciales_invalidas" };
}

/** Cierra la sesión. */
export function cerrarSesion() {
  try {
    localStorage.removeItem(SESION_KEY);
  } catch (_) {
    /* ignore */
  }
}
