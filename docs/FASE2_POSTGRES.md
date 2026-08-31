# Fase 2 — Migración a PostgreSQL (Supabase / Neon)

Documento de terreno para la integración.

## 1. Contexto

- **Hoy:** el Worker API (`workers/`) lee 3 tablas de Google Sheets vía service account (solo lectura).
- **Objetivo Fase 2:** PostgreSQL multi-tenant en la nube (Supabase o Neon, ambos con tier gratuito sin tarjeta). Cada comercio = un `tenant`. La app **escribe** sus propios productos/conteos.
- **Import:** el maestro actual de Google Sheets se importa 1 sola vez a `articulos` del tenant demo (Fase 1), y luego el sheet deja de ser fuente de datos.

## 2. Modelo de datos ACTUAL (lo que produce `normalizeArticulo` en `workers/src/sheets.js`)

Origen: pestaña `Maestro_de_Articulos`.

| Campo JS | Columna sheet | Tipo | Notas |
|---|---|---|---|
| `codigo_articulo` | `Codigo_articulo` | string | Clave interna empresa. NO numérico (ej `INT40019`, `101080155`). |
| `descripcion` | `Descripcion` | string | |
| `codigo_barras` | `Codigo_barras` | string | Puede faltar. |
| `stock` | `Stock` | int | `parseInt(...,10)\|\|0`. ⚠️ Hay 12 registros corruptos con valores astronómicos (ver §5). |
| `categoria` | `Categoria` | string | `MEDICINAS` / `MISCELANEOS`. |
| `subcategoria` | `Subcategoria` | string | |
| `lineas` | `Lineas` | string | |
| `proveedor` | `Proveedor` | string | |
| `marcas` | `Marcas` | string | |
| `consignacion` | `Consignacion` | boolean | `parseBool`: si/sí/yes/true/1 → true; no/false/0 → false. |
| `articulo_compra` | `Articulo_compra` | boolean | idem |
| `pareto` | `Pareto` | boolean | idem |
| `impuestos` | `Indicador de impuestos` | string | Texto libre (ej "EXENTO", "DEBITO FISCAL"). |
| `costo` | `Costo` | float | `parseNum`: quita puntos de miles, coma decimal → `1.234,56` → `1234.56`. |
| `precio` | `Precio` | float | idem |
| `precio_especial` | `Precio_Especial` | float | idem |
| `precio_vigente` | — derivado | float | `precio_especial > 0 ? precio_especial : precio` |
| `gravado` | — derivado | boolean|null | `impuestoEsGravado`: contiene "exento" → false; "debito"/"credito"/"gravado" → true; si no, null. |

## 3. Esquema SQL propuesto (multi-tenant)

```sql
-- tenants: cada cliente (farmacia) con su entorno personalizado (Fase 2)
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  slug          text unique not null,
  logo_url      text,
  color_primario text default '#004d99',
  plan          text default 'demo',      -- demo | pago
  activo        boolean default true,
  creado_el     timestamptz default now()
);

-- articulos: maestro por tenant
create table articulos (
  id              bigint generated always as identity primary key,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  codigo_articulo text,
  codigo_barras   text,
  descripcion     text,
  stock           integer not null default 0,
  categoria       text,
  subcategoria    text,
  lineas          text,
  proveedor       text,
  marcas          text,
  consignacion    boolean,
  articulo_compra boolean,
  pareto          boolean,
  impuestos       text,
  costo           numeric(14,2),
  precio          numeric(14,2),
  precio_especial numeric(14,2),
  gravado         boolean,
  -- derivados: precio_vigente = coalesce(nullif(precio_especial,0), precio)
  creado_el       timestamptz default now(),
  actualizado_el  timestamptz default now()
);

create unique index ux_articulos_tenant_barras on articulos (tenant_id, codigo_barras);
create unique index ux_articulos_tenant_code   on articulos (tenant_id, codigo_articulo);

-- tomas_inventario: conteo físico por lote (viene de Inventario_fisico)
create table tomas_inventario (
  id                bigint generated always as identity primary key,
  tenant_id         uuid not null references tenants(id) on delete cascade,
  articulo_id       bigint references articulos(id) on delete cascade,
  codigo_articulo   text,
  lote              text,
  fecha_vencimiento date,
  ubicacion         text,
  cantidad          integer not null default 0,
  quien             text,
  tomada_el         timestamptz default now()
);

create index ix_tomas_tenant on tomas_inventario (tenant_id, codigo_articulo);
create unique index ux_tomas_tenant_lote on tomas_inventario (tenant_id, codigo_articulo, lote, fecha_vencimiento);
```

> **Nota DBA:** la KPI "Próximos a vencer" se calcula con `fecha_vencimiento`; hoy se guarda como fecha `dd/mm/aaaa` desde `Inventario_fisico`. En Postgres usar `date`. También existe el rango de salud del stock: `critico ≤ 10`, `bajo ≤ 25`, resto normal.

## 4. Variables de entorno del Worker (nuevas)

El worker pasará de `readRange` (Sheets) a un cliente Postgres. Sin paquetes pesados: usar la `REST API` de Supabase vía `fetch`, o `@cloudflare/pg` / hyperdrive.

- `DATABASE_URL` — cadena de conexión (o prest/las individuales)
- `PGHOST`, `PGPORT`(5432), `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- `PGSSL=true`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` si se usa la REST API (postgREST)
- Los secretos actuales (`GOOGLE_SERVICE_ACCOUNT_JSON`, `SPREADSHEET_ID`) quedan solo para el import inicial y se pueden remover de producción después.

## 5. ⚠️ Datos corruptos a limpiar durante el import

12 artículos en `Maestro_de_Articulos` tienen `Stock` astronómico (cientos de millones) que inflan toda la KPI. Confirmado con `int` real del sheet. El DBA **ya está depurando el sheet**. Al importar a Postgres debe validarse (ej `check (stock between 0 and 100000)` o limpiar antes).

## 6. Mapeo de endpoints del Worker actual → consultas futuras

| Endpoint | Hoy | Fase 2 (Postgres) |
|---|---|---|
| `GET /api/kpis` | recorre 28k objetos en memoria | `select` agregado por tenant |
| `GET /api/articulo/:term` | busca por `codigo_barras` o `codigo_articulo` | `where tenant_id=? and (codigo_barras=? or codigo_articulo=?)` |
| `GET /api/articulo/codigo/:codigo` | `byCode.get(codigo)` | `where tenant_id=? and codigo_articulo=?` |
| `POST /api/cache/reload` | resetea caché en memoria | (ya no aplica; siempre fresco, o caché CDN) |
| `GET /api/articulo/:codigo` lotes | filtra `Inventario_fisico` en memoria | `select * from tomas_inventario where tenant_id=? and codigo_articulo=?` |

## 7. Plan de migración

1. Crear esquema (SQL de §3) en Supabase/Neon.
2. Script de import: leer sheet maestro + inventario → `insert into articulos, tomas_inventario` (tenant demo).
3. Adaptar `workers/src/sheets.js` → nuevo módulo `pg.js` con las mismas funciones exportadas (`getKPIs`, `buscarConLotes`, `detallePorCodigo`) para no tocar `index.js`.
4. Cambiar env de worker; probar endpoints; restringir CORS (§ próximamente).
5. Fase 2 completa: login + entorno por tenant (logo/colores) y escritura desde la app.