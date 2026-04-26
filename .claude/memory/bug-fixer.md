# Bug Fixer Memory

## Correcciones aplicadas

### 2026-04-26 — 12 bugs P1 (UI + BE + DA)

**[UI-003] ClientDetail.tsx: counters Cotizaciones/Pedidos siempre 0**
- Archivo: `frontend/src/pages/ClientDetail.tsx` (línea 250-253)
- Cambio: `quotations?.total` → `quotations?.pagination?.total`; `orders?.total` → `orders?.pagination?.total`

**[UI-004] Credit.tsx: pago registrado con $0 hardcodeado**
- Archivo: `frontend/src/pages/Credit.tsx`
- Cambio: agregado `payAmount` state; `mutationFn` acepta `{ id, amount }`; inline UI muestra input numérico con botón Confirmar deshabilitado si monto <= 0

**[UI-001] QuotationForm.tsx: no leía clientId del navigation state**
- Archivo: `frontend/src/pages/QuotationForm.tsx`
- Cambio: importado `useLocation`; nuevo `useEffect([location.state])` que llama `clientsApi.getById`, setea cliente, shippingAddress, suggestedDiscount y avanza a step 2

**[UI-002] OrderForm.tsx: no leía clientId del navigation state**
- Archivo: `frontend/src/pages/OrderForm.tsx`
- Cambio: importado `useLocation` y `useEffect`; nuevo `useEffect([location.state])` que carga cliente y pre-llena recipientName, phone, address, city

**[BE-021] tags.ts: /bulk-assign inaccesible (capturado como /:id)**
- Archivo: `backend/src/routes/tags.ts`
- Cambio: bloque `PATCH /bulk-assign` movido antes de `PUT /:id`; bloque duplicado al final eliminado

**[BE-033] clients.ts: PATCH /bulk-segment sin autorización de rol**
- Archivo: `backend/src/routes/clients.ts`
- Cambio: importado `requireRole`; `requireRole('GERENTE', 'VENTAS')` agregado al handler

**[BE-034] invoices.ts: POST / sin autorización de rol**
- Archivo: `backend/src/routes/invoices.ts`
- Cambio: importado `requireRole`; `requireRole('GERENTE', 'VENTAS')` agregado al POST /

**[DA-005] orders.ts: guideNumber no persistía en PATCH /:id/status**
- Archivo: `backend/src/routes/orders.ts` (PATCH /:id/status)
- Cambio: `...(guideNumber !== undefined ? { guideNumber } : {})` agregado al `data` del update

**[DA-003] production.ts: assignedUser no incluido en GET lista y PATCH status**
- Archivo: `backend/src/routes/production.ts`
- Cambio: `assignedUser: { select: { id: true, name: true } }` agregado al include de `findMany` y del `update` en PATCH /:id/status

**[DA-004] orders.ts: PUT /:id retornaba pedido sin relaciones**
- Archivo: `backend/src/routes/orders.ts` (PUT /:id)
- Cambio: `include: { client, items: { include: { product } } }` agregado al `prisma.order.update`

**[BE-022] orders.ts: PATCH /:id/status retornaba 500 en vez de 404**
- Archivo: `backend/src/routes/orders.ts` (catch del PATCH /:id/status)
- Cambio: `catch` tipado como `unknown`; guarda P2025 → 404

**[BE-029] production.ts: PATCH /:id/status retornaba 500 en vez de 404**
- Archivo: `backend/src/routes/production.ts` (catch del PATCH /:id/status)
- Cambio: mismo patrón P2025 → 404

**[BE-027] products.ts: low-stock incluía productos con minStock=0**
- Archivo: `backend/src/routes/products.ts` (GET /low-stock)
- Cambio: `AND "minStock" > 0` agregado a la cláusula WHERE del query raw



### 2026-04-25 — PDF cotizaciones: layout y variables de entorno

**[TASK-013] PDF tabla: altura dinámica + clip descripción**
- Archivo: `backend/src/routes/quotations.ts`
- `charsPerLine` usa divisor `4.0` (más conservador); `doc.text(prod.name)` agrega `height: ROW_HEIGHT - 8` para clampar texto dentro del row

**[TASK-022] COMPANY: city y phone desde env vars**
- Archivo: `backend/src/routes/quotations.ts`
- `city` lee `process.env.COMPANY_CITY`; `phone` default corregido a `3177606126`; `address` default corregido a `Calle 3 # 6 A - 22 (Bodega 101)`

**[TASK-018/019] Hardcoded strings reemplazados por COMPANY.*:**
- PDF drawShippingLabel: nombre empresa y ciudad → `COMPANY.name`, `COMPANY.city`
- PDF firma: nombre empresa → `COMPANY.name`
- HTML strip footer: ciudad → `${escape(COMPANY.city)}`
- HTML remite box: nombre y ciudad → `${escape(COMPANY.name)}`, `${escape(COMPANY.city)}`
- HTML firma: nombre → `${escape(COMPANY.name)}`

**[TASK-023/024] QuotationForm: toast + descuento automático por segmento**
- Archivo: `frontend/src/pages/QuotationForm.tsx`
- Estado `suggestedDiscount` (0 por defecto)
- Al seleccionar cliente IM/DS/CF: `setSuggestedDiscount(disc.pct)` + `toast(...)` informativo
- `addItem` usa `suggestedDiscount` como `discount` inicial; dependencia agregada al `useCallback`
- Antes: `discount: 0` siempre. Después: discount pre-llenado con porcentaje del segmento

**Notas:** TASK-014, 015, 016, 017, 020, 025, 026, 027 ya estaban implementados. `.env.example` ya tenía todos los campos.

---

### 2026-04-25 — 5 bugs P0 críticos (rutas Express + seed + DIAN)

**[BUG-P0-1] notifications.ts: PATCH /read-all capturado como /:id/read**
- Archivo: `backend/src/routes/notifications.ts`
- Cambio: `PATCH /read-all` movido antes de `PATCH /:id/read`
- Antes: /:id/read registrado primero; 'read-all' capturado como ID → 404
- Después: /read-all registrado primero; ambas rutas resuelven correctamente

**[BUG-P0-2] campaigns.ts: /experiments y /analyze-photo inaccesibles**
- Archivo: `backend/src/routes/campaigns.ts`
- Cambio: `GET /experiments`, `POST /experiments`, `PUT /experiments/:id/complete` y `POST /analyze-photo` movidos antes del bloque `GET /:id`
- Imports de experiment-registry, marco e image-gen movidos junto con las rutas; duplicados al final eliminados

**[BUG-P0-3] sync.ts: JWT bloqueaba al agente Python**
- Archivo: `backend/src/routes/sync.ts`
- Cambio: `router.use(authenticate)` global reemplazado por middleware selectivo `syncSecret`
- Rutas agente (/pending, /complete, /merlin-pending, /merlin-done, /merlin-error) → `syncSecret` (X-Sync-Secret header; si SYNC_SECRET no configurado, acepta)
- Rutas UI (/status, /request, /merlin-queue) → `authenticate`
- Nueva var de entorno opcional: `SYNC_SECRET`

**[BUG-P0-4] seed.ts: FK violation al re-seed**
- Archivo: `backend/prisma/seed.ts`
- Cambio: 14 `deleteMany()` de modelos de campañas/IA agregados al inicio del cleanup, antes de `activityLog.deleteMany()`
- Orden FK-safe: campaignRecipient → campaignMetric → campaignStep → campaign → dripEnrollment → dripSequence → notification → aIUsageLog → generatedImage → dIANInvoice → merlinSyncQueue → whatsAppMessage → whatsAppChat → dIANConfiguration

**[BUG-P0-5] dian.ts: POST /send lanzaba 400 en lugar de 501**
- Archivo: `backend/src/routes/dian.ts`
- Cambio: `res.status(400)` → `res.status(501)` con mensaje descriptivo de feature pendiente y campo `phase: 'B'`

---

### 2026-04-25 — Sprint 1 backend/frontend bugs

**[TASK-006] Orders.tsx: columna LISTO ausente del kanban**
- Archivo: `frontend/src/pages/Orders.tsx` (líneas 15-28, 82-86, 139)
- Cambio: `LISTO` insertado en `STATUSES` entre `EN_PRODUCCION` y `EMPACADO`; `nextStatus` actualizado a `EN_PRODUCCION→LISTO`, `LISTO→EMPACADO`; grid cambiado de `grid-cols-5` a `grid-cols-6`; skeleton de `Array(5)` a `Array(6)`
- Antes: 5 columnas, pedidos LISTO invisibles, transición EN_PRODUCCION→EMPACADO
- Después: 6 columnas con LISTO (teal), transición correcta

**[TASK-007] types/index.ts: OrderStatus sin LISTO**
- Sin cambio necesario: `LISTO` ya estaba presente en línea 30 de `types/index.ts`

**[TASK-008] quotations.ts: DELETE solo permite BORRADOR**
- Archivo: `backend/src/routes/quotations.ts` (línea 448)
- Cambio: `existing.status !== 'BORRADOR'` → `!['BORRADOR', 'RECHAZADA'].includes(existing.status)`
- Mensaje de error actualizado para reflejar ambos estados permitidos

**[TASK-009 + TASK-010] clients.ts: 4 queries secuenciales + lastOrder redundante**
- Archivo: `backend/src/routes/clients.ts` (líneas 182-197)
- Cambio: 4 queries secuenciales → 3 queries en `Promise.all`; `findFirst` de `lastOrder` eliminado, reemplazado por `client.orders[0]` (ya cargado en `findUnique` con `take:5, orderBy:createdAt desc`)

**[TASK-011] clients.ts: campo segment ausente del schema Zod**
- Archivo: `backend/src/routes/clients.ts` (línea 31)
- Cambio: `segment: z.enum(['IM', 'DS', 'CF']).optional().nullable()` agregado a `clientSchema`
- El campo ya pasa al Prisma update via `validation.data as any` en el handler PUT

---

### 2026-04-20 — Panel "¿Qué vas a hacer hoy?" para rol VENTAS

**[FEATURE-6] Panel de inicio rápido VENTAS en Dashboard**
- Archivo: `frontend/src/pages/Dashboard.tsx` (líneas 38-39, 51-52, 114-149)
- Import `useAuthStore` agregado; `user` extraído del store
- Panel condicional `user?.role === 'VENTAS'` insertado antes de `<DailyBriefing />`
- Tres botones: Nueva cotización (`/cotizaciones/nueva`), Hacer seguimiento (`/cotizaciones?status=ENVIADA`), Convertir a pedido (`/cotizaciones?status=APROBADA`)
- Sin cambios a lógica existente

---

### 2026-04-20 — OrderDetail + inventory WhatsApp alert

**[BUG-1] guideNumber input bloqueado**
- Archivo: `frontend/src/pages/OrderDetail.tsx`
- Cambio: `guideNumber` → `guideNumberDraft`; `useEffect` inicializa desde `order.guideNumber`; input usa solo estado local
- Antes: `value={order.guideNumber ?? guideNumber}` (campo bloqueado si existe valor en DB)
- Después: `value={guideNumberDraft}` con `useEffect(() => { if (order?.guideNumber) setGuideNumberDraft(order.guideNumber) }, [order?.guideNumber])`

**[BUG-2] picked decorativo**
- Archivos: `backend/src/routes/orders.ts`, `frontend/src/lib/api.ts`, `frontend/src/pages/OrderDetail.tsx`
- Backend: nuevo endpoint `PATCH /api/orders/:id/items/:itemId/pick`
- api.ts: `pickItem(orderId, itemId, picked)` agregado a `ordersApi`
- Frontend: `markPicked` mutation; div checkbox reemplazado por `<button>` interactivo

**[BUG-3] Dos tipos de foto (EMPAQUE y REMITE)**
- Archivo: `frontend/src/pages/OrderDetail.tsx`
- `remiteRef` agregado; `uploadPhoto` acepta `{ file, phase }`; galería agrupa por `phase`; dos botones separados

**[BUG-4] LISTO ausente del stepper + bypass stock**
- Archivos: `frontend/src/pages/OrderDetail.tsx`, `frontend/src/types/index.ts`, `frontend/src/components/ui/StatusBadge.tsx`, `backend/prisma/schema.prisma`, `backend/src/routes/orders.ts`
- `LISTO` agregado a `OrderStatus` enum en schema, tipos frontend, StatusBadge, STEPS array, ORDER_INDEX, validaciones backend
- Banner bypass para pedidos 100% STOCK en estado CONFIRMADO
- REQUIRIO `db:generate` (schema.prisma modificado) — ejecutar `npm run db:push` en backend para aplicar a DB

**[FEATURE-5] WhatsApp stock alert (Evolution API)**
- Archivo: `backend/src/routes/inventory.ts`
- Alerta silent post-movimiento cuando `stock <= minStock`; usa `updatedProduct` del transaction
- Vars de entorno agregadas a `backend/.env`: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `ADMIN_WHATSAPP_NUMBER` (placeholder 573XXXXXXXXX — reemplazar con número real)

**TypeScript:** `npx tsc --noEmit` sin errores en frontend y backend.

### 2026-04-16 — Layout móvil MARAL OS

No fue una corrección de bug sino implementación de feature. Documentado aquí como referencia.

**Archivos creados:**
- `frontend/src/hooks/useMobile.ts` — hook con resize listener, retorna `true` si `window.innerWidth <= 768`
- `frontend/src/components/layout/MobileLayout.tsx` — layout dark #0A0F14 con top bar + bottom nav 5 tabs
- `frontend/src/pages/mobile/MobileDashboard.tsx` — KPI cards scroll horizontal, alertas, actividad reciente
- `frontend/src/pages/mobile/MobileOrders.tsx` — lista pedidos con chips de estado
- `frontend/src/pages/mobile/MobileClients.tsx` — lista clientes con búsqueda
- `frontend/src/pages/mobile/MobileQuotations.tsx` — lista cotizaciones con chips de estado

**Archivos modificados:**
- `frontend/src/App.tsx` (líneas 1-80) — importa `useMobile` + `MobileLayout` + páginas móviles; rutas `/`, `/clientes`, `/cotizaciones`, `/pedidos` condicionan por `isMobile`

**Paleta móvil:**
- Fondo: `#0A0F14` / Cards: `#141C26` / Bordes: `#1E2D3D`
- Acento verde: `#22C55E` / Verde bg: `#14532D`
- Texto: `#F1F5F9` / Secundario: `#94A3B8` / Muted: `#475569`

**TypeScript:** `npx tsc --noEmit` sin errores.
**Restricciones respetadas:** ningún componente desktop modificado.

---

### 2026-04-25 — Sprints 3 y 7: frontend/backend fixes

**[TASK-032] Whatsapp.tsx: "Abrir chat" no seleccionaba el chat**
- Archivo: `frontend/src/pages/Whatsapp.tsx`
- Cambio: `useSearchParams` importado; `jid` leído del query param; nuevo `useEffect([jid, data?.data.data])` que busca el chat y llama `setSelectedChat`.

**[TASK-033] Whatsapp.tsx: token leído de clave localStorage incorrecta**
- Archivo: `frontend/src/pages/Whatsapp.tsx`
- Antes: bloque IIFE parseando `localStorage.getItem('maral-auth')`
- Después: `const token = useAuthStore((s) => s.token) ?? ''`; importado `useAuthStore` de `../store/auth`.

**[TASK-034] CampaignComposer.tsx: alert() nativo → toast**
- Archivo: `frontend/src/components/campaigns/CampaignComposer.tsx`
- Antes: `alert(...)` en `onSuccess` y `onError` de `launchMutation`
- Después: `toast.success(...)` y `toast.error(...)`; importado `toast` de `sonner`.

**[TASK-035] CampaignComposer.tsx: errores de updateStep silenciados**
- Archivo: `frontend/src/components/campaigns/CampaignComposer.tsx`
- Antes: `catch { // silently ignore }`
- Después: `catch (err) { console.error('Error al guardar paso de campaña:', err) }`

**[TASK-041] api.ts: assignable en usersApi**
- Archivo: `frontend/src/lib/api.ts`
- Agregado: `assignable: () => api.get<User[]>('/users/assignable')`

**[TASK-042] api.ts: autofill en aiApi**
- Archivo: `frontend/src/lib/api.ts`
- Agregado: `autofill: (payload: Record<string, unknown>) => api.post('/ai/autofill', payload)`

**[TASK-044] Settings.tsx: botón X del modal sin type="button"**
- Archivo: `frontend/src/pages/Settings.tsx`
- Antes: `<button onClick={onClose} ...>`
- Después: `<button type="button" onClick={onClose} ...>`

**[TASK-057] CampaignReports.tsx: imports muertos de recharts**
- Archivo: `frontend/src/pages/CampaignReports.tsx`
- Removidos: `FunnelChart`, `Funnel`, `LabelList`. `Cell` conservado.

**[TASK-059] api.ts: documentar authApi.login como dead code**
- Archivo: `frontend/src/lib/api.ts`
- Agregado comentario: `// Reservado — login por email deshabilitado. Usar loginCedula.`

**[TASK-060] Whatsapp.tsx: useEffect con dependencia faltante**
- Archivo: `frontend/src/pages/Whatsapp.tsx`
- Antes: `}, [data?.data.data])`
- Después: `}, [data?.data.data, selectedChat?.jid])` (primitivo para evitar bucle infinito)

**[TASK-061] dashboard.ts: eliminar salesLast6Months y salesByLine del /kpis**
- Archivo: `backend/src/routes/dashboard.ts`
- Eliminados: `salesLast6Months: []` y `salesByLine: []` del objeto `res.json({...})`

---

### 2026-04-25 — Seguridad e idempotencia WhatsApp/Campaigns

**[TASK-028] whatsapp.ts: webhook sin verificación de firma**
- Archivo: `backend/src/routes/whatsapp.ts` (antes de `res.sendStatus(200)`)
- Cambio: Bloque de verificación HMAC-SHA256 insertado al inicio del handler POST /webhook. Si `EVOLUTION_WEBHOOK_SECRET` está configurado, verifica el header `x-evolution-signature` o `x-hub-signature-256`. Si la firma es inválida → 401.
- `crypto` ya estaba importado (línea 4), no se reimportó.
- Nueva var de entorno opcional: `EVOLUTION_WEBHOOK_SECRET`

**[TASK-029] whatsapp.ts: mensajes sin key.id generaban duplicados en BD**
- Archivo: `backend/src/routes/whatsapp.ts` (función `upsertChatAndMessage`, ~línea 238)
- Antes: `where: { remoteId: params.remoteId ?? \`local_${Date.now()}_${Math.random()}\` }` — cada reintento producía un ID distinto → duplicado
- Después: `deterministicId` calculado con SHA-256 sobre `jid|timestamp|text`; usado tanto en `where` como en `create.remoteId`. Idempotente en reintentos.

**[TASK-030] campaigns.ts: /launch sin verificar EVOLUTION_API_URL**
- Archivo: `backend/src/routes/campaigns.ts` (handler POST /:id/launch)
- Cambio: Check `evolutionUrl` al inicio del handler (antes del `findUnique`). Si no hay ninguna de las tres vars (`EVOLUTION_API_URL`, `EVOLUTION_BASE_URL`, `EVOLUTION_URL`) → 503 inmediato. La campaña no cambia de estado.

**[TASK-031] campaigns.ts: endpoint POST /:id/reset para campañas atascadas**
- Archivo: `backend/src/routes/campaigns.ts` (insertado antes de GET /:id)
- Nuevo endpoint: `POST /api/campaigns/:id/reset` — solo `GERENTE`, solo campañas `EN_CURSO`. Resetea a `BORRADOR`.

---

### 2026-04-25 — Sprint data/schema fixes

**[TASK-036] inventory.ts + dashboard.ts: criticalStock incluía minStock=0**
- Archivos: `backend/src/routes/inventory.ts` (línea 213), `backend/src/routes/dashboard.ts` (líneas 53, 268)
- Cambio: agregado `AND "minStock" > 0` a las 3 queries raw SQL que calculan stock crítico
- Antes: `WHERE active = true AND stock <= "minStock"` — incluía productos con minStock=0
- Después: `WHERE active = true AND "minStock" > 0 AND stock <= "minStock"`

**[TASK-037] reports.ts: filtro de ventas por createdAt → updatedAt**
- Archivo: `backend/src/routes/reports.ts` (líneas 43-47)
- Cambio: `orderWhere.createdAt` → `orderWhere.updatedAt` en handler GET /sales
- Antes: filtraba pedidos por fecha de creación (inconsistente con dashboard)
- Después: usa updatedAt igual que dashboard (fecha real de despacho/entrega)

**[TASK-038] schema.prisma: onDelete: Restrict en 4 relaciones**
- Archivo: `backend/prisma/schema.prisma`
- Agregado `onDelete: Restrict` a: QuotationItemComponent→component, OrderItem→product, PurchaseItem→product, Order→client
- db:push aplicado exitosamente

**[TASK-039] schema.prisma: FK formal ProductionOrder.assignedTo → User**
- Archivo: `backend/prisma/schema.prisma`
- ProductionOrder: `assignedUser User? @relation("ProductionAssigned", fields: [assignedTo], references: [id], onDelete: SetNull)`
- User: `productionOrders ProductionOrder[] @relation("ProductionAssigned")`
- db:push aplicado. `prisma generate` requiere detener el backend (DLL bloqueado en Windows)

**[TASK-040] seed.ts: Tasks y Expenses de prueba**
- Archivo: `backend/prisma/seed.ts`
- 3 tareas: URGENTE/PENDIENTE gerente, NORMAL/EN_PROGRESO logistica, NORMAL/COMPLETADA vendedora
- 3 gastos: CAJA_MENOR 85k (2026-04-10), TARJETA 120k (2026-04-15), CAJA_MENOR 45k (2026-04-20)

**[TASK-045] lib/dian.ts: IVA fallback documentado**
- Archivo: `backend/src/lib/dian.ts` (~línea 458)
- `it.taxRate ?? taxRate` ya funcionaba correctamente; agregado comentario TODO explícito

**[TASK-046] lib/dian.ts: NIT 222222222 comentado**
- Archivo: `backend/src/lib/dian.ts` (~línea 501)
- Fallback ya correcto: `invoice.client.rut?.replace(/\D/g, '') || '222222222'`
- Agregado comentario explicativo del estándar DIAN para consumidor final
