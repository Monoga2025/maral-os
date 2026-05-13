# 📅 Sprint Backlog & Roadmap — MARAL OS
> Auditoría técnica generada el 2026-04-25. Implementación ejecutada el 2026-04-25.
> Fuentes: bug-explorer, ui-auditor, data-auditor + revisión de CLAUDE.md.
>
> **Estado:** ✅ Sprint 0, 1, 2, 3, 4, 5-parcial completados. ⏳ Sprint 6 bloqueado en inputs externos. Sprint 7 incluido en ejecución anterior.
>
> ⚠️ **Acción requerida:** Detener backend → `cd backend && npx prisma generate` → reiniciar. El schema.prisma cambió (FK relations) y el cliente Prisma debe regenerarse.

---

## 🚨 Hallazgos Críticos (P0 — Bloquean funcionalidad inmediatamente)

1. **`/api/sync` bloqueado por JWT** — el agente Python de sincronización Merlin nunca puede operar.
2. **`/api/notifications/read-all` siempre devuelve 404** — Express lo captura como `id = 'read-all'`.
3. **`/api/campaigns/experiments` y `/analyze-photo` inaccesibles** — registradas después de `/:id`, capturadas como param.
4. **Re-seed rompe con FK violation** — 14 modelos de campañas/IA no están en el cleanup del seed.
5. **DIAN nunca envía facturas reales** — `POST /send` lanza 400 explícito por XAdES no implementado.

---

## 🏃 Sprint 0: Hotfixes de Emergencia
**Objetivo:** Corregir los 5 P0 que bloquean operación sin tocar lógica de negocio.
**Prioridad:** 🔴 Alta — hacer antes de cualquier otra cosa
**Estimado:** 1 día

- [ ] **TASK-001** `backend/src/routes/notifications.ts` — mover `PATCH /read-all` **antes** de `PATCH /:id/read` (Express captura 'read-all' como ID).
- [ ] **TASK-002** `backend/src/routes/campaigns.ts` — mover rutas `GET /experiments`, `POST /experiments`, `PUT /experiments/:id/complete`, `POST /analyze-photo` **antes** del bloque `GET /:id` / `POST /:id/marco`.
- [ ] **TASK-003** `backend/src/routes/sync.ts` — bypass de autenticación JWT para las rutas de sincronización Merlin. Opción A: verificar `X-Sync-Secret` header con variable de entorno `SYNC_SECRET`. Opción B: excluir rutas `/api/sync/*` del middleware `authenticate` en `index.ts`.
- [ ] **TASK-004** `backend/prisma/seed.ts` — agregar al cleanup inicial (en orden FK-safe): `campaignRecipient`, `campaignMetric`, `campaignStep`, `campaign`, `dripEnrollment`, `dripSequence`, `notification`, `aIUsageLog`, `generatedImage`, `dIANInvoice`, `merlinSyncQueue`, `whatsAppMessage`, `whatsAppChat`, `dIANConfiguration`.
- [ ] **TASK-005** `backend/src/routes/dian.ts:238` — en `POST /invoices/:invoiceId/send`, cambiar el 400 bloqueante por un mensaje claro: `{ error: 'Envío DIAN no habilitado. Fase B pendiente de implementación.' }` con status 501 para distinguirlo de errores de validación.

**Criterios de Aceptación:**
- `curl -X PATCH /api/notifications/read-all` devuelve 200, no 404.
- `GET /api/campaigns/experiments` devuelve 200 o 401, no 404.
- `npm run db:seed` completa sin FK violation en un ambiente con datos de campañas.
- Python `sync_agent.py` puede hacer GET a `/api/sync/pending` sin JWT y obtener respuesta válida.

---

## 🏃 Sprint 1: Estabilidad Core — Módulos Principales
**Objetivo:** Corregir errores visibles en los módulos de uso diario (pedidos, clientes, cotizaciones).
**Prioridad:** 🔴 Alta
**Estimado:** 2-3 días

### Pedidos
- [ ] **TASK-006** `frontend/src/pages/Orders.tsx` — agregar columna `LISTO` al kanban entre `EN_PRODUCCION` y `EMPACADO`. Pedidos en estado `LISTO` son actualmente invisibles en la vista kanban.
- [ ] **TASK-007** `frontend/src/types/index.ts:OrderStatus` — verificar contra `schema.prisma` y sincronizar. Eliminar `COTIZADO` de documentación en `CLAUDE.md` (no existe en schema). Confirmar que `LISTO` sí está en el tipo.

### Cotizaciones
- [ ] **TASK-008** `backend/src/routes/quotations.ts` — `DELETE /:id`: cambiar condición para permitir eliminar también estado `RECHAZADA` (actualmente solo `BORRADOR`). El frontend ya muestra el botón eliminar para cotizaciones rechazadas.

### Clientes
- [ ] **TASK-009** `backend/src/routes/clients.ts:182-197` — paralelizar las 4 queries secuenciales con `Promise.all([totalOrders, totalSpentAgg, lastOrder, creditUsedAgg])`. Son independientes entre sí.
- [ ] **TASK-010** `backend/src/routes/clients.ts:188-191` — reemplazar `findFirst` de `lastOrder` por `client.orders[0]` (ya está disponible del `findUnique` anterior con `take: 5, orderBy: createdAt desc`).
- [ ] **TASK-011** `backend/src/routes/clients.ts:clientSchema` — agregar `segment: z.enum(['IM', 'DS', 'CF']).optional()` para que el campo `CustomerSegment` sea actualizable vía la ruta estándar de clientes.

### Roles y Enums
- [ ] **TASK-012** `backend/prisma/schema.prisma + seed.ts` — decisión requerida: ¿`CONTADORA` es un rol activo? Si sí: crear usuario contadora en seed, agregar a `requireRole` en `reports.ts` e `invoices.ts`, documentar en CLAUDE.md. Si no: eliminar del enum `Role`.

**Criterios de Aceptación:**
- El kanban de pedidos muestra 7 columnas incluyendo `LISTO`.
- Eliminar cotización RECHAZADA devuelve 200.
- `GET /api/clients/:id` responde en < 100ms (vs los ~400ms actuales con 4 queries secuenciales).
- Actualizar `client.segment` via `PUT /api/clients/:id` funciona sin error 400.

---

## 🏃 Sprint 2: Cambios John — PDF Cotizaciones (Pendientes 2026-04-20)
**Objetivo:** Implementar los cambios solicitados por John el 2026-04-20 en el PDF y flujo de cotizaciones.
**Prioridad:** 🔴 Alta — impacto directo en ventas y presentación comercial
**Estimado:** 3-4 días

> ⚠️ John aún no entregó la lista de cambios para **Pedidos**. Implementar solo cotizaciones por ahora.

### PDF Layout
- [ ] **TASK-013** `backend/src/routes/quotations.ts (pdf)` — corregir layout para nombres de productos/clientes largos que se solapan (wrapping de texto, límite de columna).
- [ ] **TASK-014** `backend/src/routes/quotations.ts (pdf)` — eliminar columna de numeración (#) a la izquierda; poner **Cantidad** como primera columna.
- [ ] **TASK-015** `backend/src/routes/quotations.ts (pdf)` — agregar **columna de precio con descuento ya aplicado** en la tabla de productos.
- [ ] **TASK-016** `backend/src/routes/quotations.ts (pdf)` — mostrar **nombre del contacto** dentro del bloque de información del cliente.
- [ ] **TASK-017** `backend/src/routes/quotations.ts (pdf)` — **observaciones** resaltadas en color dorado/atención (borde o fondo amarillo suave).

### Remitente y Destinatario (Formato Guía)
- [ ] **TASK-018** `backend/src/routes/quotations.ts (pdf)` — rediseñar bloque remitente como guía con campos separados: Nombre, NIT, Dirección, Teléfono, Correo, Ciudad. Datos oficiales: NIT 901.889.479-8, Calle 3 # 6 A - 22 (Bodega 101), Curití - Santander, Colombia, ventas@industriasmaral.com.
- [ ] **TASK-019** `backend/src/routes/quotations.ts (pdf)` — rediseñar bloque destinatario con el mismo formato de guía que el remitente.
- [ ] **TASK-020** `backend/src/routes/quotations.ts (pdf)` — **teléfono dinámico**: si el usuario que genera es Lady (`lady@maral.com`), mostrar 3167760692; si es John u otro, mostrar 3177606126.

### Datos y Numeración
- [ ] **TASK-021** `backend/prisma/seed.ts + schema.prisma` — verificar que la secuencia de numeración de cotizaciones arranca en 4585. El seed ya tiene `setval` para esto; confirmar que el nuevo seed en producción no resetea a 1.
- [ ] **TASK-022** `backend/src/routes/quotations.ts (pdf)` — actualizar datos oficiales de MARAL en variables de entorno `COMPANY_*` y documentar en `.env.example`.

### Categorías con Descuento Automático
- [ ] **TASK-023** `frontend/src/pages/QuotationForm.tsx` — al seleccionar cliente con `segment` definido, mostrar **popup recordatorio** con el descuento sugerido: IM → 36%, DS → 26%, CF → 10%.
- [ ] **TASK-024** `frontend/src/pages/QuotationForm.tsx` — aplicar descuento automático como valor inicial en el campo de descuento del ítem al agregar producto.
- [ ] **TASK-025** `backend/src/routes/quotations.ts (pdf)` — mostrar **código de categoría** (IM / DS / CF) visible en el PDF junto al nombre del cliente.

### Firma / Pie de Página
- [ ] **TASK-026** `backend/src/routes/quotations.ts (pdf)` — agregar firma al pie del PDF:
  ```
  John Mónoga
  Gerente de Proyectos
  MARAL TECNOLOGIA Y COMUNICACIONES S.A.S.
  "Apoyando el mercado de las telecomunicaciones desde 2003"
  ```

### Logo
- [ ] **TASK-027** `backend/src/routes/quotations.ts (pdf)` — reemplazar placeholder "M" con el PNG real del logo cuando esté disponible. Dejar hook preparado: leer de `COMPANY_LOGO_PATH` en env.

**Criterios de Aceptación:**
- El PDF generado por `GET /api/quotations/:id/pdf` no tiene texto superpuesto.
- El bloque remitente/destinatario tiene formato de guía con campos separados.
- El teléfono en el PDF corresponde al usuario que hace la petición (token JWT).
- El popup de descuento aparece al seleccionar cliente con segmento IM/DS/CF.

---

## 🏃 Sprint 3: Plataforma WhatsApp y Campañas
**Objetivo:** Estabilizar los módulos de WhatsApp y Campañas para uso operativo real.
**Prioridad:** 🟡 Media-Alta
**Estimado:** 3-4 días

### Seguridad
- [ ] **TASK-028** `backend/src/routes/whatsapp.ts:469` — agregar verificación de firma/secreto en el webhook de Evolution API. Leer `EVOLUTION_WEBHOOK_SECRET` del env y comparar con header `x-evolution-signature`.

### Idempotencia
- [ ] **TASK-029** `backend/src/routes/whatsapp.ts:238` — mensajes de webhook sin `key.id` válido no deben usar `local_${Date.now()}_${Math.random()}` como clave de upsert. Usar un hash determinista del contenido (`sha256(from + timestamp + text)`) para garantizar idempotencia en reintentos de Evolution.

### Campañas
- [ ] **TASK-030** `backend/src/routes/campaigns.ts:376` — `POST /launch`: verificar que `EVOLUTION_API_URL` está configurado antes de cambiar estado a `EN_CURSO`. Si no está, responder 503 con mensaje claro en lugar de dejar la campaña atascada.
- [ ] **TASK-031** Agregar mecanismo de recovery para campañas atascadas en `EN_CURSO`: endpoint `POST /:id/reset` o campo `lastError` en el modelo para diagnóstico.

### Frontend
- [ ] **TASK-032** `frontend/src/pages/Whatsapp.tsx` — leer `useSearchParams()` al montar y, si existe `jid`, buscar el chat en la lista y llamar `setSelectedChat`. Esto habilita el "Abrir chat" desde `CampaignLeads.tsx`.
- [ ] **TASK-033** `frontend/src/pages/Whatsapp.tsx:976` — reemplazar `localStorage.getItem('maral-auth')` por `useAuthStore((s) => s.token)` para consistencia con el interceptor de Axios.
- [ ] **TASK-034** `frontend/src/components/campaigns/CampaignComposer.tsx:359` — reemplazar `alert()` por `toast.success()` / `toast.error()` de sonner.
- [ ] **TASK-035** `frontend/src/components/campaigns/CampaignComposer.tsx:302` — implementar feedback de error en `updateStep`: loguear con `console.error` y mostrar toast debounced después de 3 fallos consecutivos.

**Criterios de Aceptación:**
- Webhook de Evolution rechaza requests sin firma válida con 401.
- Campaña lanzada sin `EVOLUTION_API_URL` devuelve 503, no queda en EN_CURSO.
- `navigate('/whatsapp?jid=xxx')` abre el chat correspondiente en la página de WhatsApp.
- No hay `alert()` nativos en el flujo de campañas.

---

## 🏃 Sprint 4: Capa de Datos y Schema
**Objetivo:** Corregir inconsistencias en queries, schema y comportamiento de datos.
**Prioridad:** 🟡 Media
**Estimado:** 2 días

### Inventario y Reportes
- [ ] **TASK-036** `backend/src/routes/inventory.ts:208-215` — en la query raw SQL de `/alerts`, cambiar `WHERE stock <= "minStock"` por `WHERE "minStock" > 0 AND stock <= "minStock"`. Mismo fix en `dashboard.ts:52` para el KPI `criticalStock`.
- [ ] **TASK-037** `backend/src/routes/reports.ts:42-46` — alinear el criterio de fecha con el dashboard: usar `updatedAt` (no `createdAt`) para filtrar pedidos DESPACHADO/ENTREGADO, para consistencia de totales entre reporte y dashboard.

### Schema Prisma
- [ ] **TASK-038** `backend/prisma/schema.prisma` — declarar `onDelete` explícito en relaciones que lo omiten: `QuotationItemComponent → Product`, `OrderItem → Product`, `PurchaseItem → Product`, `InventoryMovement → Product`, `Order → Client`. Usar `Restrict` donde se quiere protección, `SetNull` donde aplique.
- [ ] **TASK-039** `backend/prisma/schema.prisma:ProductionOrder` — reemplazar `assignedTo String?` libre por relación formal `@relation` hacia `User` con `onDelete: SetNull`. Agregar el campo inverso en `User`.

### Seed
- [ ] **TASK-040** `backend/prisma/seed.ts` — agregar datos de prueba: al menos 3 tareas (estados PENDIENTE, EN_PROGRESO, COMPLETADA) y 3 gastos (CAJA_MENOR, TARJETA) para que los módulos de Tareas y Gastos tengan datos inmediatamente tras un re-seed.

### API Contracts
- [ ] **TASK-041** `frontend/src/lib/api.ts` — agregar `assignable: () => api.get<User[]>('/users/assignable')` a `usersApi`. Actualizar `Tareas.tsx` para usar el método.
- [ ] **TASK-042** `frontend/src/lib/api.ts` — agregar `autofill: (payload) => api.post('/ai/autofill', payload)` a `aiApi`. Actualizar `Gastos.tsx` y `Tareas.tsx` para usar el método.

### Types Frontend
- [ ] **TASK-043** `frontend/src/types/index.ts:DashboardData` — agregar `stalledOrders?: number` y `overdueInvoicesCount?: number` al tipo. Verificar contra respuesta real de `/api/dashboard/kpis` y eliminar los `as any` en `Dashboard.tsx`.
- [ ] **TASK-044** `frontend/src/pages/Settings.tsx:202` — agregar `type="button"` al botón X de cierre del modal de usuario (evita submit accidental en Firefox/Safari).

**Criterios de Aceptación:**
- El conteo de `criticalStock` en dashboard coincide con el conteo en la página de inventario.
- `npm run db:push` aplica sin conflictos con las relaciones añadidas.
- `npm run db:seed` crea tareas y gastos de prueba.
- `(data as any)` eliminado de Dashboard.tsx.

---

## 🏃 Sprint 5: DIAN / Facturación Electrónica
**Objetivo:** Implementar la Fase B del módulo DIAN para envío real de facturas electrónicas.
**Prioridad:** 🟠 Media-Baja — solo si la empresa necesita factura electrónica en MARAL OS (actualmente Janet lo hace manualmente en Merlin)
**Estimado:** 5-8 días (requiere investigación XAdES-BES + certificado digital DIAN)

> ⚠️ Según CLAUDE.md: la factura electrónica DIAN la genera el contador manualmente en Merlin. Este sprint solo aplica si se decide migrar esa responsabilidad a MARAL OS.

- [ ] **TASK-045** `backend/src/lib/dian.ts:458` — parametrizar tasa de IVA por ítem. Agregar campo `taxRate: Float? @default(19)` a `QuotationItem` y `OrderItem`. El XML UBL debe usar la tasa real por línea.
- [ ] **TASK-046** `backend/src/lib/dian.ts:501` — eliminar NIT hardcodeado `'222222222'`. Si el cliente no tiene `nit`/`rut`, usar `'222222222'` solo para consumidor final (NIT DIAN válido para CF). Documentar la excepción.
- [ ] **TASK-047** `backend/src/routes/dian.ts:238` — implementar firma XAdES-BES del XML UBL usando el certificado digital de Hacienda. Requiere biblioteca `node-forge` o `xmldsig`.
- [ ] **TASK-048** Crear UI para configuración DIAN: `DIANConfiguration` (NIT empresa, resolución de facturación, rango, prefijo, certificado).
- [ ] **TASK-049** Implementar numeración de facturas electrónicas dentro del rango autorizado por DIAN.

**Criterios de Aceptación:**
- `POST /api/invoices/:id/send` devuelve la respuesta de la DIAN con el CUFE.
- El XML generado pasa la validación del esquema UBL 2.1 de la DIAN.
- El certificado digital se lee desde variable de entorno `DIAN_CERT_PATH`, nunca hardcodeado.

---

## 🏃 Sprint 6: Operaciones Pendientes (No-Código)
**Objetivo:** Tareas operativas que desbloquean funcionalidades ya construidas.
**Prioridad:** 🟡 Media — ejecutar en paralelo con sprints de código
**Estimado:** 1-2 días

- [ ] **TASK-050** Correr `sync_maral.py` para poblar `merlinCode` en los 853 clientes importados de Merlin que aún no tienen el campo. Verificar con `SELECT COUNT(*) FROM "Client" WHERE "merlinCode" IS NULL`.
- [ ] **TASK-051** Deploy EasyPanel: usar `prisma migrate deploy` (no `db:push`) para producción. Configurar variables de entorno `COMPANY_*` en el panel antes de redesplegar.
- [ ] **TASK-052** Configurar variables `COMPANY_*` en `.env` de producción: `COMPANY_NAME`, `COMPANY_NIT` (901.889.479-8), `COMPANY_ADDRESS`, `COMPANY_PHONE`, `COMPANY_EMAIL`, `COMPANY_CITY`.
- [ ] **TASK-053** AutoHotkey: crear script para abrir ficha de cliente en Merlin desde MARAL OS (pendiente de diseño detallado con John).
- [ ] **TASK-054** Logo MARAL: reemplazar placeholder "M" en PDF cuando John entregue el PNG. Guardar en `backend/assets/logo.png` y apuntar con `COMPANY_LOGO_PATH`.

---

## 🏃 Sprint 7: Deuda Técnica y Limpieza
**Objetivo:** Eliminar código muerto, corregir inconsistencias menores y mejorar robustez.
**Prioridad:** 🟢 Baja — hacer cuando los módulos core estén estables
**Estimado:** 1 día

- [ ] **TASK-055** `backend/src/routes/campaigns.ts:experiment-registry` — reemplazar `Map<string, Experiment>` en memoria por tabla `Experiment` en Prisma. Los experimentos activos se pierden en cada reinicio.
- [ ] **TASK-056** `backend/src/lib/cost-tracker.ts` — cambiar `(prisma as any).aIUsageLog` por `prisma.aIUsageLog` tipado correctamente. Si el modelo no existe en el cliente, añadirlo con `db:push` + regenerar cliente.
- [ ] **TASK-057** `frontend/src/pages/CampaignReports.tsx` — remover imports muertos: `FunnelChart`, `Funnel`, `LabelList` de recharts.
- [ ] **TASK-058** `frontend/src/pages/Login.tsx` — verificar y sincronizar `roleColors`/`roleLabel` con los roles reales del enum `Role` del schema.
- [ ] **TASK-059** `frontend/src/lib/api.ts:authApi.login` — documentar con comentario `// Reservado — login por email. Flujo activo: loginCedula` o eliminar si se confirma que no se usará.
- [ ] **TASK-060** `frontend/src/pages/Whatsapp.tsx:useEffect` — corregir dependencia faltante: cambiar `[data?.data.data]` por `[data?.data.data, selectedChat?.jid]` para evitar chat desactualizado al navegar entre conversaciones.
- [ ] **TASK-061** `backend/src/routes/dashboard.ts` — eliminar campos `salesLast6Months: []` y `salesByLine: []` del endpoint `/kpis` (son arrays vacíos hardcodeados; el frontend ya usa los endpoints separados).
- [ ] **TASK-062** `frontend/src/pages/ImageLibrary.tsx:175` — definir comportamiento real de `onUse` en la biblioteca de imágenes (copiar URL al portapapeles o abrir selector de campaña). El `() => {}` actual es un no-op.

---

## 📊 Resumen Ejecutivo

| Sprint | Scope | Prioridad | Effort |
|--------|-------|-----------|--------|
| 0 — Hotfixes | 5 bugs P0 bloqueantes | 🔴 Inmediato | 1 día |
| 1 — Core Stability | Pedidos, clientes, cotizaciones | 🔴 Alta | 2-3 días |
| 2 — PDF John | 15 cambios solicitados 2026-04-20 | 🔴 Alta | 3-4 días |
| 3 — WhatsApp/Campañas | Seguridad + UX campañas | 🟡 Media-Alta | 3-4 días |
| 4 — Data Layer | Schema, queries, tipos | 🟡 Media | 2 días |
| 5 — DIAN | Factura electrónica Fase B | 🟠 Condicional | 5-8 días |
| 6 — Operaciones | Deploy, sync, AutoHotkey | 🟡 Media | 1-2 días |
| 7 — Tech Debt | Limpieza y código muerto | 🟢 Baja | 1 día |

**Total hallazgos:** 62 tareas
**P0 (bloquean sistema):** 5
**P1 (errores visibles en uso diario):** 18
**P2 (deuda técnica / UX degradada):** 39

---

## 🗂️ Índice de Fuentes por Hallazgo

| Tarea | Archivo fuente | Línea aprox. |
|-------|----------------|-------------|
| TASK-001 | `backend/src/routes/notifications.ts` | 26 |
| TASK-002 | `backend/src/routes/campaigns.ts` | 483 |
| TASK-003 | `backend/src/routes/sync.ts` | 6 |
| TASK-004 | `backend/prisma/seed.ts` | 9-27 |
| TASK-005 | `backend/src/routes/dian.ts` | 238 |
| TASK-006 | `frontend/src/pages/Orders.tsx` | 15-21 |
| TASK-007 | `frontend/src/types/index.ts` | 27-34 |
| TASK-008 | `backend/src/routes/quotations.ts` | 448 |
| TASK-009/010 | `backend/src/routes/clients.ts` | 182-197 |
| TASK-011 | `backend/src/routes/clients.ts` | clientSchema |
| TASK-012 | `backend/prisma/schema.prisma` | enum Role |
| TASK-028 | `backend/src/routes/whatsapp.ts` | 469 |
| TASK-029 | `backend/src/routes/whatsapp.ts` | 238 |
| TASK-030 | `backend/src/routes/campaigns.ts` | 376 |
| TASK-032 | `frontend/src/pages/Whatsapp.tsx` | — |
| TASK-033 | `frontend/src/pages/Whatsapp.tsx` | 976 |
| TASK-036 | `backend/src/routes/inventory.ts` | 208-215 |
| TASK-037 | `backend/src/routes/reports.ts` | 42-46 |
| TASK-038 | `backend/prisma/schema.prisma` | múltiples |
| TASK-043 | `frontend/src/types/index.ts` | DashboardData |
| TASK-045 | `backend/src/lib/dian.ts` | 458 |
| TASK-046 | `backend/src/lib/dian.ts` | 501 |
