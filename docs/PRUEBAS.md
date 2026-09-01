# Guía de Pruebas de la Demo — AuditApp

Checklist para validar la app en los dispositivos donde se presentará el demo.

URLs de producción:
- Frontoend: `https://tu-auditor-front.juanitoira1998.workers.dev`
- API: `https://tu-auditor-api.juanitoira1998.workers.dev/api/`

## Cómo probar el escáner (por dispositivo)

El escáner usa `html5-qrcode` (funciona en iOS, Android y desktop). Requiere **HTTPS** y **permiso de cámara**.

| Dispositivo | Navegadores para probar | Esperado |
|---|---|---|
| **iPhone** | Safari, Brave, Google | El escáner debe abrir la cámara trasera y detectar códigos. Es el flujo que antes NO funcionaba (BarcodeDetector no existe en iOS). |
| **Android** | Chrome, Brave | Debe escanear de forma continua. (Ya verificado anteriormente.) |
| **Desktop** | Chrome / Edge | Al abrir cámara, pide permiso y escanea (también puedes ingresar el código a mano). |

### Pasos (en cualquier dispositivo)
1. Abrir `https://tu-auditor-front.juanitoira1998.workers.dev/inicio`.
2. Tocar **"Activar cámara"** y aceptar el permiso.
3. Apuntar a un código de barras (caja de medicamento) dentro del marco.
4. Confirmar que navega al **Detalle** del producto automáticamente.

### Si la cámara no abre
- Usar **HTTPS** (workers.dev ya lo es).
- Revisar que el sitio tenga permiso de cámara en los ajustes del navegador.
- Si se niega el permiso, la app muestra el aviso "ingresa el código manualmente" (flujo de respaldo).

## Flujo funcional a validar

- [ ] `Landing (/)`: se ven los mockups (teléfono y dashboard) cargados. No deben quedar imágenes rotas.
- [ ] `Ver Demo` → `/graficos`: cargan los 4 paneles (Valuación, Stock por Categoría, Estado del Stock, Impuestos, Vencimientos).
- [ ] `Inicio` → escanear un código real → Detalle con lote/vencimiento si existe.
- [ ] `Detalle`: botón +/- del **Conteo Físico** actualiza el número.
- [ ] `BottomNav`: solo 3 tabs (Inicio, Gráficos, Ajustes) — sin duplicados.
- [ ] `Ajustes`: botón **Recargar datos** muestra "Datos recargados correctamente" (usa POST /api/cache/reload).

## Estado de datos (mientras el DBA depura)

- Los totales del dashboard pueden seguir variando mientras se limpian los 12 artículos con stock corrupto.
- Referencia: el `total_unidades` del maestro era 1,082,438,210 antes de la depuración y el 30/08/2026 pasó a 282,870.

## CORS (verificado)

- `Origin: https://tu-auditor-front.juanitoira1998.workers.dev` → API responde con `Access-Control-Allow-Origin` correcto.
- `Origin` desconocido (ej evil.com) → el API no envía header CORS → el navegador **bloquea** la lectura.
- Sin `Origin` (curl, servidor a servidor) → el API responde igual (correcto para uso interno/Fase 2).