# Bug Fixer Memory

## Correcciones aplicadas

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
