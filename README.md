# Inventario Web — Escáner, Detalle y Gráficos

Migración de AppSheet a una web propia: **React + Tailwind + Node.js/Express + Google Sheets API (Service Account)**.

Incluye: **landing**, **escáner con cámara**, **ficha del producto con rollup por lote/vencimiento** y **dashboard de gráficos**, todo leyendo datos reales del Google Sheets maestro.

---

## Estructura

```
inventario-web/
├─ client/   → Frontend React + Vite + Tailwind v3. Landing, escáner, detalle, gráficos, bottom nav.
├─ server/   → Backend Node/Express (dev local). Lee Google Sheets con caché en memoria (5 min).
├─ workers/  → Backend desplegado en Cloudflare Workers (producción). API serverless.
├─ docs/     → Especificación de Fase 2: migración a PostgreSQL (FASE2_POSTGRES.md).
```

---

## Requisitos

- Node.js 18+ (probado con v24)
- Cuenta de Google Cloud + Service Account con acceso de **lectura** a la hoja.
- El ID del Google Sheet (`SPREADSHEET_ID`).

## 1. Preparar la Service Account (una vez)

1. En [Google Cloud Console](https://console.cloud.google.com) crea un proyecto (o usa uno existente).
2. Activa la API: **Google Sheets API**.
3. Menú **IAM y administración → Cuentas de servicio** → Crear cuenta.
4. Crea una **clave JSON** y descárgala (guárdala segura; no la subas a Git).
5. Comparte tu **Google Sheet** con el correo de la service account (rol **lector**), igual que compartirías con una persona.

## 2. Configurar el servidor

```bash
cd server
cp .env.example .env
# edita .env (elige UNO de estos métodos de credencial):
#   Método A (archivo local, dev):
#     GOOGLE_SERVICE_ACCOUNT_FILE=C:/ruta/a/service-account.json
#   Método A (JSON embebido, ideal para Render):
#     GOOGLE_SERVICE_ACCOUNT_JSON={...contenido del json...}
#   Método B (correo + clave):
#     GOOGLE_SERVICE_ACCOUNT_EMAIL=...
#     GOOGLE_PRIVATE_KEY=...
# Y siempre:
#   SPREADSHEET_ID=xxxxxxxxxxxxxx
npm install
npm run dev
```

El servidor arranca en `http://localhost:4000`.

## 3. Configurar el cliente (desarrollo)

```bash
cd client
npm install
npm run dev
```

El frontend arranca en `http://localhost:5173` y reenvía `/api` al servidor (no hace falta configurar URLs).

## 4. Producción

El servidor sirve el frontend compilado y aplica el fallback SPA (ruta `/` → `index.html`). Desde la raíz del repo:

```bash
npm install        # instala server + client (postinstall)
npm run build      # compila el frontend a client/dist
npm start          # arranca el backend en producción (sirve dist)
```

Con `NODE_ENV=production` las rutas `/api/debug/*` quedan deshabilitadas y `/` devuelve la landing (HTML).

## 5. Despliegue en Render

La app está pensada para Render (Blueprint incluido en `render.yaml`). Flujo:

1. Sube el proyecto a un repositorio de **GitHub**.
2. En Render: **New → Blueprint** y conecta el repo (usa `render.yaml`).
3. Configura los **secrets/env vars** del servicio:
   - `SPREADSHEET_ID` → ID de tu Google Sheet.
   - `GOOGLE_SERVICE_ACCOUNT_JSON` → **contenido completo** del JSON de la service account (como una sola línea).
4. Da a **Deploy**. Render ejecuta `npm install && npm run build` y luego `npm start`.

> **Importante:** la credencial se comparte por variable de entorno (Método A: `GOOGLE_SERVICE_ACCOUNT_JSON`). Nunca subas el JSON al repositorio; `.gitignore` lo excluye (`*.json`).

---

## Rutas de la app

| Ruta | Pantalla |
|------|----------|
| `/` | Landing pública |
| `/inicio` | Inicio + escáner con cámara |
| `/detalle/:term` | Ficha del producto con lotes y conteo físico |
| `/graficos` | Dashboard de donas y KPIs |
| `/ajustes` | Ajustes |

---

## Autenticación de la API

Endpoints (el frontend usa los dos primeros):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/articulo/:term` | Busca por **código de barras** o **código de artículo**. Devuelve ficha con lotes y total contado. |
| GET | `/api/kpis` | Agregados para gráficos: stock por categoría, estado, impuestos, vencimientos y totales. |
| GET | `/api/articulo/codigo/:codigo` | Detalle por código de artículo exacto. |
| POST | `/api/cache/reload` | Fuerza recarga de la caché (tras editar la hoja). |
| GET | `/api/debug/*` | Diagnóstico (solo disponible en desarrollo). |

---

## Escáner en el navegador

- En **Chrome/Android** (y otros Chromium) usa `BarcodeDetector` para leer EAN-13/UPC/Code128 automáticamente.
- En otros navegadores, permite `getUserMedia` para ver la cámara y ofrece **entrada manual del código** como respaldo.
- La cámara requiere **HTTPS** o `localhost` (que es lo que usamos en dev).

---

## Notas de arquitectura

- **Google Sheets es la fuente única de verdad.** El backend cachea el maestro completo en memoria (Map O(1) por código de barras) durante `CACHE_TTL_MS` (default 5 min) para que cada escaneo sea instantáneo.
- Al editar la hoja, espera hasta el próximo TTL o llama `POST /api/cache/reload`.
- Números con coma (`4,61`) se normalizan a punto en el backend (`parseNum`).
- Umbral de stock crítico (10) y bajo (25) están definidos en `Detalle.jsx` (`estadoStock`) — reubícalos a una hoja de configuración cuando quieras.
- El diseño usa **Tailwind v3** con la paleta Material 3 (ver `client/tailwind.config.js`).
