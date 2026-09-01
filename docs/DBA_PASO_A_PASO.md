# DBA — Paso a paso para entregar el PostgreSQL de AuditApp

Documento para **el/la DBA** que preparó la base. Esto es lo que debe quedar
lista y **entregada** para que el Worker de Cloudflare (la API) pueda leer y
escribir. Cualquier duda, abrir issue o pegar este archivo en el canal.

---

## 1. Plataforma elegida

Usar una de estas dos (o ambas, son compatibles). El Worker de Cloudflare se
conecta por REST o por TCP:

| Opción | Cómo se conecta el Worker | Paquete / verbo |
|---|---|---|
| **Supabase** | REST API (postgREST) con service role key | `fetch` a `https://<ref>.supabase.co/rest/v1/...` |
| **Neon / Postgres directo** | TCP + TLS | Hyperdrive o `@cloudflare/pg` |

> Recomendado: **Supabase** si se busca cero infraestructura y un tier gratuito;
> **Neon** si ya se prefiere connection string clásica. Decidir UNA para no
> duplicar trabajo.

---

## 2. Credenciales que hay que entregar (según la opción)

### Si es Supabase
- `SUPABASE_URL` → `https://<ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → el `service_role` (NO el `anon`, porque el
  servicio necesita saltarse RLS y leer/escribir todas las tablas).
- Proyecto con el esquema ya creado (§4) y el import hecho (§5).

### Si es Neon / Postgres directo
- `DATABASE_URL` → `postgres://user:password@host:5432/dbname` (con SSL).
- O bien por partes: `PGHOST`, `PGPORT` (5432), `PGDATABASE`, `PGUSER`,
  `PGPASSWORD`, `PGSSL=true`.
- Host accesible desde Cloudflare Workers (idealmente con una IP de salida o
  Hyperdrive — si no, Neon y Supabase son accesibles de fábrica).

---

## 3. Dónde coloca el DBA cada credencial (para que quede "entregado")

El Worker vive en **Cloudflare Workers** (cuenta `juanitoira1998`, worker
`tu-auditor-api`). Las credenciales SE PONEN COMO **SECRETS** de ese worker
(nunca en el código ni en el repo):

```bash
# desde la carpeta workers/
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# ── o para Neon ──
npx wrangler secret put DATABASE_URL
```

> Si el DBA no tiene acceso a la cuenta de Cloudflare, simplemente **entregar
> las credenciales en un mensaje privado/gestor de secretos** y las coloco yo.
> **Nunca** pegar secretos en el repo, issues ni chats compartidos.

---

## 4. Esquema SQL que debe existir (correr UNA vez)

Multi-tenant: cada negocio = un `tenant`. Ejecutar esto en la base:

```sql
-- tenants: cada cliente con su entorno (logo, color, plan)
create table if not exists tenants (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  slug           text unique not null,
  logo_url       text,
  color_primario text default '#004d99',
  plan           text default 'demo',        -- demo | pago
  activo         boolean default true,
  creado_el      timestamptz default now()
);

-- articulos: maestro por tenant
create table if not exists articulos (
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
  creado_el       timestamptz default now(),
  actualizado_el  timestamptz default now()
);

create unique index if not exists ux_articulos_tenant_barras
  on articulos (tenant_id, codigo_barras);
create unique index if not exists ux_articulos_tenant_code
  on articulos (tenant_id, codigo_articulo);

-- tomas_inventario: conteo físico (lotes / vencimientos)
create table if not exists tomas_inventario (
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

create index if not exists ix_tomas_tenant
  on tomas_inventario (tenant_id, codigo_articulo);
create unique index if not exists ux_tomas_tenant_lote
  on tomas_inventario (tenant_id, codigo_articulo, lote, fecha_vencimiento);
```

> Extra que el DBA puede agregar para **escritura de ingreso** (aparición nueva,
> no estaba en el esquema original pero la app ya la necesita):

```sql
-- ingreso_log: cada movimiento de ingreso/alta de stock
create table if not exists ingreso_log (
  id            bigint generated always as identity primary key,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  ticket        text,
  items         jsonb not null default '[]'::jsonb,
  creado_el     timestamptz default now()
);
```

---

## 5. Import inicial (el maestro que hoy vive en Google Sheets)

El origen actual son estas pestañas de la hoja `1PjZy7Srv0Oa3_YGmlVG1zsqbgSOe0V84wRyg4CzL7Ao`:
- `Maestro_de_Articulos` → tabla `articulos`
- `Inventario_fisico` → tabla `tomas_inventario`

**Requisitos del import (importante):**
1. Crear **UN tenant demo** primero:
   ```sql
   insert into tenants (nombre, slug, plan) values ('Demo', 'demo', 'demo')
   returning id;
   ```
   Y usar su `tenant_id` para todos los artículos importados.
2. **Limpiar los ~12 artículos con Stock astronómico** (cientos de millones).
   Validar con `check (stock between 0 and 100000)` o descartarlos antes de
   insertar. La KPI "stock" no debe inflarse.
3. `precio_vigente` se deriva en la app: `coalesce(nullif(precio_especial,0), precio)`.
4. `gravado` se deriva: `impuestos` que contenga "exento" → false; "debito"/
   "credito"/"gravado" → true; si no → null.
5. `codigo_articulo` NO es numérico (ej `INT40019`). Guardar como texto.

---

## 6. Validación que debe pasar antes de decir "listo"

Que el DBA confirme con estos `SELECT` (deben dar números razonables):

```sql
-- 1. ¿Está la conexión y hay un tenant demo?
select id, nombre, slug, plan from tenants where slug = 'demo';

-- 2. ¿El import llegó completo? (~28.238 artículos en la hoja)
select count(*) from articulos a join tenants t on t.id = a.tenant_id
where t.slug = 'demo';

-- 3. ¿Stock limpio? (ningún valor astronómico)
select max(stock) from articulos a join tenants t on t.id = a.tenant_id
where t.slug = 'demo';

-- 4. ¿Hay lotes/vencimientos importados?
select count(*) from tomas_inventario;
```

---

## 7. Qué "entregar" al final (checklist)

- [ ] Plataforma decidida (Supabase o Neon).
- [ ] Credenciales entregadas (secretos en el worker o en mensaje privado).
- [ ] Esquema de §4 corrido.
- [ ] Tabla `ingreso_log` creada (o confirmar que la creo yo).
- [ ] Import de §5 hecho (un tenant `demo` + ~28.238 artículos).
- [ ] Validación de §6 OK (counts y stock saneado).

Con esto entregado, conecto el Worker: reemplazo la fuente de datos
(Google Sheets → PostgreSQL), expongo `POST /api/ops/ingreso` para escritura
real y pruebo los endpoints. **El Frontend (AuditApp) no cambia**: ya
habla con los mismos endpoints.
