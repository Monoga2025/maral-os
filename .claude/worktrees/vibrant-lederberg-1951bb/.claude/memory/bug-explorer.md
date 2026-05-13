# Bug Explorer Memory — MARAL OS

## Sesión 2026-04-25

### Archivos analizados
- backend/src/routes/dian.ts
- backend/src/routes/whatsapp.ts
- backend/src/routes/ai.ts
- backend/src/routes/campaigns.ts
- backend/src/routes/notifications.ts
- backend/src/routes/sync.ts
- backend/src/routes/image-gen.ts
- backend/src/lib/dian.ts
- backend/src/lib/notifier.ts
- backend/src/lib/experiment-registry.ts
- backend/src/lib/image-gen.ts
- backend/src/lib/drip-scheduler.ts
- backend/src/lib/cost-tracker.ts
- backend/src/lib/brand-guard.ts
- backend/src/lib/pacing.ts
- backend/src/lib/campaign-sender.ts
- backend/src/lib/evolutionApi.ts

### Bugs encontrados

| ID | Archivo | Línea | Severidad | Descripción |
|----|---------|-------|-----------|-------------|
| BE-001 | sync.ts | 18 | P1 | Estado de sync en memoria, se pierde al reiniciar |
| BE-002 | sync.ts | 6+50 | P0 | Agente local bloqueado por authenticate en rutas de polling |
| BE-003 | sync.ts | 67 | P1 | /complete y /merlin-done sin requireRole |
| BE-004 | routes/dian.ts | 238 | P0 | Envío DIAN bloqueado en producción — XAdES no implementado (Fase B) |
| BE-005 | lib/dian.ts | 501 | P0 | NIT '222222222' hardcodeado como fallback en facturas UBL |
| BE-006 | lib/dian.ts | 458 | P1 | IVA hardcodeado 19% para todos los productos |
| BE-007 | lib/dian.ts | 477 | P1 | Ítem sintético genérico cuando Invoice no tiene líneas de detalle |
| BE-008 | whatsapp.ts | 469 | P1 | Webhook sin validación de firma HMAC |
| BE-009 | whatsapp.ts | 238 | P1 | Mensajes sin remoteId se duplican en cada reintento |
| BE-010 | whatsapp.ts | 549 | P2 | fromMeLast siempre false |
| BE-011 | campaigns.ts | 483 | P0 | GET/POST /experiments y POST /analyze-photo inaccesibles (capturadas por /:id) |
| BE-012 | campaigns.ts | 376 | P1 | Launch sin validar Evolution configurado |
| BE-013 | notifications.ts | 26 | P0 | PATCH /read-all inaccesible — capturada por /:id/read |
| BE-014 | notifications.ts | 99 | P2 | /leads/:id/attended sin requireRole |
| BE-015 | image-gen.ts | 21 | P1 | Rate limit nunca se aplica si AIUsageLog no está en schema |
| BE-016 | lib/image-gen.ts | 114 | P1 | response_format: {type:'image'} no estándar en OpenRouter |
| BE-017 | ai.ts | 87 | P2 | POST /briefing retorna null sin contrato claro |
| BE-018 | ai.ts | 143 | P2 | Rol CONTADORA hardcodeado — no existe en UserRole enum |
| BE-019 | experiment-registry.ts | 29 | P1 | Experimentos en memoria — se pierden al reiniciar |
| BE-020 | cost-tracker.ts | 21 | P1 | aIUsageLog accedido con as any — logging siempre silenciado |

### Patrones recurrentes identificados
1. RUTAS INALCANZABLES: Rutas con path fijo registradas DESPUÉS de rutas con parámetro dinámico `/:id`. Afecta campaigns (/experiments, /analyze-photo), notifications (/read-all).
2. ESTADO EN MEMORIA SIN PERSISTENCIA: sync.ts (syncStatus) y experiment-registry.ts (registry Map). Ambos se pierden al reiniciar.
3. MODELOS PRISMA OPCIONALES CON as any: cost-tracker.ts accede a `aIUsageLog` con optional chaining sobre cast. Si el modelo no existe en schema, el código falla silenciosamente.
4. AUTENTICACIÓN EN RUTAS DE AGENTE: sync.ts usa router.use(authenticate) global, bloqueando al agente local Python que no lleva JWT.
5. DIAN INCOMPLETA: Todo el módulo DIAN es Fase A — genera XML pero NO puede enviar a producción (falta firma XAdES, ZIP, y los datos de items son sintéticos).

---

## Sesión 2026-04-26

### Archivos analizados
- backend/src/middleware/auth.ts
- backend/src/index.ts
- backend/src/routes/auth.ts
- backend/src/routes/clients.ts
- backend/src/routes/dashboard.ts
- backend/src/routes/orders.ts
- backend/src/routes/quotations.ts
- backend/src/routes/invoices.ts
- backend/src/routes/inventory.ts
- backend/src/routes/production.ts
- backend/src/routes/purchases.ts
- backend/src/routes/products.ts
- backend/src/routes/expenses.ts
- backend/src/routes/tasks.ts
- backend/src/routes/users.ts
- backend/src/routes/reports.ts
- backend/src/routes/suppliers.ts
- backend/src/routes/tags.ts
- backend/src/routes/segments.ts
- backend/src/routes/categories.ts

### Bugs encontrados (sesión 2026-04-26)

| ID | Archivo | Línea | Severidad | Descripción |
|----|---------|-------|-----------|-------------|
| BE-021 | tags.ts | 71 | P1 | /bulk-assign inalcanzable — capturada por /:id/clients (ruta fija registrada DESPUÉS de /:id) |
| BE-022 | orders.ts | 324-409 | P1 | PATCH /:id/status sin check de existencia — Prisma P2025 no manejado explícitamente |
| BE-023 | orders.ts | 412-424 | P2 | PATCH /:id/items/:itemId/pick sin validación de body — picked puede ser cualquier tipo |
| BE-024 | quotations.ts | 420-437 | P2 | PATCH /:id/status catch vacío — errores de Prisma silenciados completamente |
| BE-025 | quotations.ts | 362-391 | P1 | PUT /:id elimina items y crea nuevos sin validar que items no sea array vacío en update |
| BE-026 | inventory.ts | 100-110 | P1 | Race condition en stock — lectura y escritura no atómica (lee stock, calcula, luego transacción) |
| BE-027 | products.ts | 87-108 | P2 | GET /low-stock incluye productos con minStock=0 y stock=0 (WHERE stock <= minStock sin minStock > 0) |
| BE-028 | users.ts | 16-17 | P2 | Rol CONTADORA en createUserSchema/updateUserSchema — no existe en UserRole enum del schema Prisma |
| BE-029 | production.ts | 210-243 | P1 | PATCH /:id/status sin verificar existencia — Prisma P2025 llega como 500 sin mensaje útil |
| BE-030 | dashboard.ts | 39 | P2 | activeOrders incluye status EMPACADO que no existe en enum OrderStatus del sistema |
| BE-031 | auth.ts | 20-41 | P1 | GET /api/auth/users expone lista completa de usuarios sin autenticación (endpoint público) |
| BE-032 | expenses.ts | 166-211 | P2 | PATCH /:id/approve sin requireRole — usa chequeo manual de role, inconsistente con patrón del proyecto |
| BE-033 | clients.ts | 159-176 | P1 | PATCH /bulk-segment accesible por cualquier rol autenticado — sin restrict de rol |
| BE-034 | invoices.ts | 169-213 | P1 | POST /api/invoices sin restrict de rol — cualquier autenticado puede crear facturas de cartera |
| BE-035 | quotations.ts | 439-460 | P2 | DELETE /:id no elimina items hijos en Prisma — depende de onDelete Cascade en schema |

### Patrones recurrentes identificados (sesión 2026-04-26)
1. RUTA INALCANZABLE REPETIDA: /bulk-assign en tags.ts registrada después de /:id/clients — mismo patrón que BE-011 y BE-013.
2. PATCH SIN EXISTENCIA CHECK: production/:id/status y orders/:id/status no verifican que el registro exista antes del update — Prisma lanza P2025 que llega como 500 genérico.
3. ROL CONTADORA: Aparece en users.ts schema pero no existe en UserRole enum Prisma — consistente con BE-018 de ai.ts.
4. FALTA DE ROLE RESTRICTION: Varios endpoints de mutación (bulk-segment, create invoice, approve expense) carecen de requireRole explícito.
5. RACE CONDITION INVENTARIO: inventory/movement lee stock en JS, calcula y luego escribe en transacción — entre la lectura y la transacción otro request puede modificar el stock.
