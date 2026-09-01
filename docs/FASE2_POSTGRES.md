# Fase 2 — PostgreSQL con Neon (ESTADO: MIGRADO ✅)

> **Actualizado:** la integración con PostgreSQL ya está **en producción**.
> La API de Cloudflare Worker lee y escribe en **Neon** (PostgreSQL administrado).
> Google Sheets ya **no es** la fuente de datos de la app (quedó solo como origen
> histórico del import inicial).

## 1. Resumen de lo que hay AHORA

- **Base:** Neon PostgreSQL, base `neondb`, admin: **Daniel (DBA)**.
- **Tablas** (creadas por Daniel): `tenants`, `articulos`, `tomas_inventario`.
- **Tenant demo:** `id = a3dbb606-eada-45ef-8617-8a6ce398db5e`, `slug = 'demo'`,
  `nombre = 'AuditApp'`, `plan = 'demo'`.
- **Datos importados (por quien migró):** 28.238 artículos en `articulos`
  (maestro de Google Sheets, saneado) y 28 conteos en `tomas_inventario`.
- **Worker API** (`workers/`): lee de Neon vía `@neondatabase/serverless`
  (WebSocket, nodo sin bloqueo TCP) con `compatibility_flags = ["nodejs_compat"]`.
  El `DATABASE_URL` se guarda como **secret** del worker (nunca en el repo).

## 2. Fuente de datos en el Worker

- `workers/src/sheets.js` → **reemplazado** por `workers/src/pg.js` como import en
  `workers/src/index.js`.
- `pg.js` exporta el MISMO contrato que antes (`getKPIs`, `buscarConLotes`,
  `detallePorCodigo`, `listArticulos`, `resetCache`, `configureWorkerEnv`) y
  agrega `registrarIngreso` (escritura). El front NO cambió: habla con los mismos
  endpoints.
- `sheets.js` queda en el repo solo como referencia histórica, ya no se importa.

## 3. Saneamiento aplicado al import

- **Stock astronómico** (~12 registros corruptos con cientos de millones) → se
  fijó a `0` (y se respeta el `CHECK stock BETWEEN 0 AND 100000`).
- **`codigo_barras` duplicados** (1849 filas / 289 barras, incl. 1100 con el
  literal corrupto `#N/D`) → `#N/D` se pasó a `NULL`; para barras reales
  repetidas se dejó la barra en el primer registro y `NULL` en el resto
  (`codigo_articulo` es UNIQUE y no tiene duplicados, es la clave estable).
- **Fechas** `dd/mm/yyyy` → `date` ISO de Postgres al importar
  (ej. `31/12/2999` se descartó por no ser una fecha de vencimiento razonable).

## 4. Variables / secrets del Worker

En `workers/wrangler.toml` ([vars]):
- `TENANT_ID_DEMO = "a3dbb606-eada-45ef-8617-8a6ce398db5e"` (tenant de la demo).

Como **secret** del worker (no en el repo):
- `DATABASE_URL` → cadena de conexión de Neon
  (ej `postgres://user:pass@ep-...-pooler.region.aws.neon.tech/neondb?sslmode=require`).

## 5. Endpoints verificados (producción)

| Endpoint | Origen | Estado |
|---|---|---|
| `GET /api/kpis` | Neon `articulos` | ✅ 28.238 artículos |
| `GET /api/articulos?page=&limit=&q=` | Neon `articulos` | ✅ paginado |
| `GET /api/articulo/:term` | Neon `articulos`+`tomas_inventario` | ✅ detalle + lotes |
| `GET /api/articulo/codigo/:codigo` | Neon `articulos` | ✅ |
| `POST /api/ops/ingreso` | Neon `articulos` (UPDATE stock / alta) | ✅ escritura real |
| `POST /api/cache/reload` | resetea caché en memoria | ✅ |

## 6. Modelo de datos (para Daniel)

```sql
create table tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text unique not null,
  logo_url text,
  color_primario text default '#004d99',
  plan text default 'demo',
  activo boolean default true,
  creado_el timestamptz default now()
);
create table articulos (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  codigo_articulo text,
  codigo_barras text,
  descripcion text,
  stock integer not null default 0 check (stock between 0 and 100000),
  categoria text, subcategoria text, lineas text, proveedor text, marcas text,
  consignacion boolean, articulo_compra boolean, pareto boolean,
  impuestos text, costo numeric(14,2), precio numeric(14,2),
  precio_especial numeric(14,2), gravado boolean,
  creado_el timestamptz default now(), actualizado_el timestamptz default now()
);
create unique index ux_articulos_tenant_barras on articulos (tenant_id, codigo_barras);
create unique index ux_articulos_tenant_code   on articulos (tenant_id, codigo_articulo);
create table tomas_inventario (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  articulo_id bigint references articulos(id) on delete cascade,
  codigo_articulo text, lote text, fecha_vencimiento date, ubicacion text,
  cantidad integer not null default 0, quien text,
  tomada_el timestamptz default now()
);
create index ix_tomas_tenant on tomas_inventario (tenant_id, codigo_articulo);
create unique index ux_tomas_tenant_lote on tomas_inventario (tenant_id, codigo_articulo, lote, fecha_vencimiento);
```

> Pendiente (opcional, a coordinar con Daniel): tabla `ingreso_log` para guardar
> el historial de tickets de ingreso. Hoy la escritura suma stock en `articulos`
> y el historial visual queda local en el front (localStorage) hasta que exista
> esa tabla.

## 7. Rol del equipo

- **Daniel (DBA):** administra la base Neon (esquema, datos, permisos, backups).
- **Resto del equipo:** front + worker (API) + integración. Hoy la app ya opera
  contra el Neon que administra Daniel.
