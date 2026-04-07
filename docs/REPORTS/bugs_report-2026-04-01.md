# BUGS REPORT — MARAL OS
> Generado por: Subagente B — Data Auditor
> Fecha: 2026-04-01
> Scope: Schema Prisma, consultas de datos, validaciones, lógica de negocio en routes

---

## RESUMEN EJECUTIVO

| Severidad | Cantidad |
|-----------|---------|
| P0 (Crítico) | 4 |
| P1 (Alto) | 6 |
| P2 (Medio) | 7 |
| **Total** | **17** |

---

## BUGS ENCONTRADOS

### [B-001] Enum mismatch: frontend usa 'COMPLETADO', backend define 'TERMINADO'
- **Archivo**: `backend/prisma/schema.prisma` (línea 298-303) y `backend/src/routes/production.ts` (línea 214)
- **Severidad**: P0 (crítico)
- **Descripción**: El enum `ProductionStatus` en el schema define `TERMINADO` como estado final. El QA context documenta que el frontend usa `'COMPLETADO'`. El backend valida contra `['PENDIENTE', 'EN_PROCESO', 'TERMINADO', 'EMPACADO']`. Cualquier request del frontend con `status: 'COMPLETADO'` retornará un error 400 silencioso para el usuario.
- **Evidencia**:
  ```prisma
  enum ProductionStatus {
    PENDIENTE
    EN_PROCESO
    TERMINADO   // ← backend usa esto
    EMPACADO
  }
  ```
  ```typescript
  // production.ts línea 214
  const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'TERMINADO', 'EMPACADO'];
  ```
- **Fix sugerido**: Alinear el frontend para usar `'TERMINADO'` o migrar el enum del schema a `COMPLETADO` con una migración Prisma. Recomendado: cambiar en el frontend para no requerir migración de DB.

---

### [B-002] Enum mismatch: InvoiceStatus — frontend puede usar 'PENDIENTE', backend usa 'VIGENTE'
- **Archivo**: `backend/prisma/schema.prisma` (línea 389-393)
- **Severidad**: P0 (crítico)
- **Descripción**: El enum `InvoiceStatus` define `VIGENTE`, `VENCIDA`, `PAGADA`. El QA context documenta que el frontend puede enviar `'PENDIENTE'`. Crear o filtrar facturas con status `'PENDIENTE'` causará un error Prisma en runtime (valor de enum inválido).
- **Evidencia**:
  ```prisma
  enum InvoiceStatus {
    VIGENTE   // ← no existe 'PENDIENTE'
    VENCIDA
    PAGADA
  }
  ```
- **Fix sugerido**: Auditar el frontend (`frontend/src/lib/api.ts` y componentes de facturas) para reemplazar toda ocurrencia de `'PENDIENTE'` por `'VIGENTE'`.

---

### [B-003] convert-to-order NO hereda kitComponents de la cotización
- **Archivo**: `backend/src/routes/quotations.ts` (líneas 330-354)
- **Severidad**: P0 (crítico)
- **Descripción**: Al convertir una cotización a pedido, se consulta `items` de la cotización pero **sin incluir** los `kitComponents`. Los `QuotationItemComponent` (componentes personalizados del BOM) se pierden silenciosamente. El pedido resultante no tiene información de qué componentes específicos lleva cada kit.
- **Evidencia**:
  ```typescript
  // línea 294-297: include solo trae items, no kitComponents
  const quotation = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: { items: true, client: true },  // ← kitComponents no incluido
  });
  // línea 337-343: crea OrderItems sin trasladar componentes de kit
  items: {
    create: quotation.items.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      unitPrice: item.unitPrice,  // ← kitComponents perdidos
    })),
  },
  ```
- **Fix sugerido**: Cambiar el include a `{ items: { include: { kitComponents: true } }, client: true }`. Sin embargo, `OrderItem` no tiene un campo `kitComponents` en el schema — evaluar si se necesita crear esa relación o si es suficiente con documentar los componentes en la cotización.

---

### [B-004] PATCH /orders/:id/status NO actualiza updatedById — rompe auditoría
- **Archivo**: `backend/src/routes/orders.ts` (líneas 301-330)
- **Severidad**: P0 (crítico)
- **Descripción**: El modelo `Order` tiene el campo `updatedById` para registrar quién cambió el estado del pedido. El endpoint `PATCH /:id/status` **nunca actualiza** ese campo. El flujo crítico de auditoría de cambios de estado queda roto.
- **Evidencia**:
  ```typescript
  // línea 310-313: no incluye updatedById
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: status as never },  // ← falta updatedById: req.user!.userId
  });
  ```
- **Fix sugerido**: Agregar `updatedById: req.user!.userId` al objeto `data` del update.

---

### [B-005] N+1 query en GET /production/:id — materialCheck hace N queries individuales
- **Archivo**: `backend/src/routes/production.ts` (líneas 96-109)
- **Severidad**: P1 (alto)
- **Descripción**: El endpoint de detalle de orden de producción verifica disponibilidad de materiales con `Promise.all(materials.map(async (mat) => prisma.product.findUnique(...)))`. Si `specs.materials` tiene N elementos, se ejecutan N queries separadas a la DB. En producción con recetas grandes esto puede causar latencia alta.
- **Evidencia**:
  ```typescript
  // líneas 96-109: un findUnique por cada material
  const materialChecks = await Promise.all(
    materials.map(async (mat) => {
      const matProduct = await prisma.product.findUnique({  // ← N queries
        where: { id: mat.productId },
        ...
      });
    })
  );
  ```
- **Fix sugerido**: Reemplazar con `prisma.product.findMany({ where: { id: { in: materials.map(m => m.productId) } } })` y luego mapear los resultados en memoria.

---

### [B-006] GET /dashboard/sales-chart — N+1: ejecuta 6 queries en bucle secuencial
- **Archivo**: `backend/src/routes/dashboard.ts` (líneas 134-158)
- **Severidad**: P1 (alto)
- **Descripción**: El chart de ventas usa un bucle `for` con `await prisma.order.aggregate()` dentro de él. Esto ejecuta 6 queries de forma secuencial (una por cada mes), en lugar de paralelo. Cada carga del dashboard sufre latencia acumulada de 6 round-trips.
- **Evidencia**:
  ```typescript
  for (let i = 5; i >= 0; i--) {
    // ...
    const result = await prisma.order.aggregate({  // ← await dentro del for
      where: { ... },
    });
  ```
- **Fix sugerido**: Convertir a `Promise.all(Array.from({length: 6}, ...).map(async (i) => ...))` para ejecutar los 6 aggregates en paralelo.

---

### [B-007] GET /dashboard/sales-by-line — usa createdAt en lugar de updatedAt para filtrar ventas
- **Archivo**: `backend/src/routes/dashboard.ts` (líneas 175-182)
- **Severidad**: P1 (alto)
- **Descripción**: En `sales-by-line`, el filtro de pedidos completados usa `createdAt: { gte: startOfYear }`, pero en `sales-chart` (líneas 139-145) y `kpis` (líneas 27-34) se usa `updatedAt` para el mismo concepto (fecha en que el pedido fue despachado/entregado). Esto causa inconsistencia en los datos: `sales-by-line` puede incluir pedidos que se crearon este año pero aún no se han despachado, o excluir pedidos despachados este año que se crearon el año anterior.
- **Evidencia**:
  ```typescript
  // dashboard.ts línea 178-181: usa createdAt
  order: {
    status: { in: ['DESPACHADO', 'ENTREGADO'] },
    createdAt: { gte: startOfYear },  // ← inconsistente con sales-chart
  },
  // vs. sales-chart línea 140-145: usa updatedAt
  where: {
    status: { in: ['DESPACHADO', 'ENTREGADO'] },
    updatedAt: { gte: start, lte: end },  // ← diferente criterio
  },
  ```
- **Fix sugerido**: Unificar criterio. Lo correcto para "ventas realizadas" es filtrar por `updatedAt` (o mejor aún, `dispatchDate` cuando esté disponible), no por `createdAt`.

---

### [B-008] PUT /quotations/:id — deleteMany de items no está en transacción con el create
- **Archivo**: `backend/src/routes/quotations.ts` (líneas 243-260)
- **Severidad**: P1 (alto)
- **Descripción**: Al actualizar una cotización con nuevos items, se hace `prisma.quotationItem.deleteMany()` **fuera de la transacción** (línea 243), y el `prisma.quotation.update()` con los nuevos items ocurre en una operación separada (línea 246). Si el update falla, los items existentes ya fueron borrados y no se restauran. La cotización queda sin items.
- **Evidencia**:
  ```typescript
  // línea 243: delete fuera de transacción
  await prisma.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
  
  // línea 246: update separado — si falla, los items ya se borraron
  const quotation = await prisma.quotation.update({ ... });
  ```
- **Fix sugerido**: Envolver ambas operaciones en `prisma.$transaction([...])` o usar la sintaxis de nested write con `deleteMany` dentro del `update`.

---

### [B-009] stockStatus incorrecto cuando stock === minStock === 0
- **Archivo**: `backend/src/routes/inventory.ts` (líneas 56-58) y `backend/src/routes/products.ts` (línea 70-71)
- **Severidad**: P1 (alto)
- **Descripción**: La lógica `p.stock === 0 ? 'SIN_STOCK' : p.stock <= p.minStock ? 'CRITICO' : 'OK'` prioriza `SIN_STOCK` sobre `CRITICO`. Sin embargo, si un producto tiene `stock=0` y `minStock=0`, se clasifica como `SIN_STOCK` cuando en realidad el stock está correcto (no hay mínimo definido). Adicionalmente, cuando `stock > 0` pero `minStock=0`, la condición `stock <= minStock` nunca es verdadera (correcto), pero el caso `stock=0, minStock=0` debería ser `OK` no `SIN_STOCK`.
- **Evidencia**:
  ```typescript
  // inventory.ts línea 56-58
  stockStatus: p.stock === 0 ? 'SIN_STOCK' : p.stock <= p.minStock ? 'CRITICO' : 'OK'
  // Caso: stock=0, minStock=0 → retorna 'SIN_STOCK' → incorrecto, debería ser 'OK'
  ```
- **Fix sugerido**: Cambiar a: `p.minStock > 0 && p.stock === 0 ? 'SIN_STOCK' : p.minStock > 0 && p.stock <= p.minStock ? 'CRITICO' : 'OK'`

---

### [B-010] GET /invoices — auto-update de facturas vencidas en cada GET es un efecto secundario peligroso
- **Archivo**: `backend/src/routes/invoices.ts` (líneas 101-108)
- **Severidad**: P1 (alto)
- **Descripción**: Cada petición GET al listado de facturas ejecuta un `updateMany` para marcar como `VENCIDA` las facturas cuya `dueDate < now`. Este efecto secundario (write) en un endpoint GET viola el principio REST y puede causar: (1) timeouts en consultas cuando hay muchas facturas, (2) race conditions si múltiples usuarios consultan simultáneamente, (3) el campo `updatedAt` de las facturas se actualiza con cada GET aunque no haya cambio real de datos de negocio.
- **Evidencia**:
  ```typescript
  // invoices.ts líneas 101-108
  await prisma.invoice.updateMany({
    where: { status: 'VIGENTE', dueDate: { lt: now } },
    data: { status: 'VENCIDA' },
  });
  ```
- **Fix sugerido**: Mover esta lógica a un job/cron programado (diario), o calcular `daysOverdue` en tiempo real sin mutar el estado, o al menos ejecutarlo solo cuando el usuario navega a la sección de cartera (no en cada GET paginado).

---

### [B-011] Seed no borra Tasks, Expenses ni QuotationItemComponent — puede causar errores en re-seed
- **Archivo**: `backend/prisma/seed.ts` (líneas 12-26)
- **Severidad**: P1 (alto)
- **Descripción**: El cleanup del seed borra entidades en orden, pero omite: `Task`, `Expense`, y `QuotationItemComponent`. Si el seed se ejecuta sobre una DB con esas entidades, el posterior `deleteMany` en entidades relacionadas (User, Client, Order) fallará por restricciones de FK, ya que Tasks referencian a User y Client, y Expenses referencian a User.
- **Evidencia**:
  ```typescript
  // seed.ts línea 12-26: no incluye Task, Expense, QuotationItemComponent
  await prisma.activityLog.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.orderPhoto.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotationItem.deleteMany();  // falta QuotationItemComponent antes de esto
  await prisma.quotation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.client.deleteMany();  // fallará si hay Tasks con clientId
  await prisma.user.deleteMany();    // fallará si hay Tasks o Expenses
  ```
- **Fix sugerido**: Agregar antes de `client.deleteMany()`: `await prisma.task.deleteMany()` y `await prisma.expense.deleteMany()`. Agregar antes de `quotationItem.deleteMany()`: `await prisma.quotationItemComponent.deleteMany()`.

---

### [B-012] Kanban de pedidos — N+1: 6 queries separadas en lugar de un groupBy
- **Archivo**: `backend/src/routes/orders.ts` (líneas 119-133)
- **Severidad**: P2 (medio)
- **Descripción**: El modo kanban ejecuta 6 `prisma.order.findMany()` en paralelo (uno por status) en lugar de una sola query con `groupBy` o un `findMany` sin filtro de status. Aunque son paralelas, esto genera 6 round-trips a la DB en lugar de 1.
- **Evidencia**:
  ```typescript
  await Promise.all(
    statuses.map(async (s) => {
      const orders = await prisma.order.findMany({  // ← 6 queries
        where: { ...where, status: s as never },
        ...
      });
    })
  );
  ```
- **Fix sugerido**: Hacer un solo `findMany` sin filtro de status (con el resto de filtros), luego agrupar en memoria por `status`. O usar `groupBy` si solo se necesitan conteos.

---

### [B-013] GET /clients/:id — 3 queries adicionales no-agrupadas para stats
- **Archivo**: `backend/src/routes/clients.ts` (líneas 117-127)
- **Severidad**: P2 (medio)
- **Descripción**: El endpoint de detalle de cliente ejecuta 3 queries adicionales separadas (`count`, `aggregate`, `findFirst`) fuera de la query principal. Aunque no son N+1 en el sentido clásico, se puede consolidar con `Promise.all` (ya está). El problema real es que el endpoint `GET /:id/stats` (línea 241) hace exactamente las mismas 5 queries que ya se ejecutaron en `GET /:id`, duplicando trabajo si el frontend llama a ambos endpoints.
- **Evidencia**: El endpoint `GET /:id` (línea 88) y `GET /:id/stats` (línea 241) computan las mismas estadísticas con las mismas queries.
- **Fix sugerido**: Eliminar `GET /:id/stats` y que el frontend use los datos de `stats` incluidos en `GET /:id`, o consolidar los stats en la respuesta de `GET /:id` y deprecar el endpoint stats.

---

### [B-014] ProductComponent no valida ciclos de kits (kit que contiene un kit que contiene el primero)
- **Archivo**: `backend/src/routes/products.ts` (líneas 321-326)
- **Severidad**: P2 (medio)
- **Descripción**: Al actualizar los componentes de un kit, se valida que el kit no se contenga a sí mismo directamente (`selfRef`), pero no se detectan ciclos indirectos (A contiene B, B contiene A). Un ciclo en el BOM causaría problemas al expandir la lista de materiales.
- **Evidencia**:
  ```typescript
  // products.ts línea 322-325: solo valida auto-referencia directa
  const selfRef = validation.data.components.find((c) => c.componentId === req.params.id);
  if (selfRef) {
    res.status(400).json({ error: 'Un kit no puede contener a sí mismo como componente' });
  }
  // No detecta: Kit A → Kit B → Kit A
  ```
- **Fix sugerido**: Implementar una verificación de grafos (DFS) para detectar ciclos antes de guardar los componentes, o al menos documentar la limitación y restringir en la UI que los kits solo puedan contener productos no-kit.

---

### [B-015] `daysOverdue` solo se calcula cuando status === 'VENCIDA' — facturas VIGENTE vencidas no muestran mora
- **Archivo**: `backend/src/routes/invoices.ts` (líneas 129-135 y 164-169)
- **Severidad**: P2 (medio)
- **Descripción**: El cálculo de `daysOverdue` retorna `0` si el status de la factura es `'VIGENTE'`, pero puede haber una ventana de tiempo entre cuando la factura vence y cuando se ejecuta el `updateMany` (ej: si el auto-update del GET falla o se elimina). En esa ventana, facturas realmente vencidas mostrarían `daysOverdue: 0`.
- **Evidencia**:
  ```typescript
  // invoices.ts línea 131-134
  daysOverdue: inv.status === 'VENCIDA'
    ? Math.floor((now - dueDate) / MS_PER_DAY)
    : 0,  // ← retorna 0 aunque dueDate < now y status aún sea VIGENTE
  ```
- **Fix sugerido**: Calcular `daysOverdue` basado en `dueDate < now` independientemente del status: `daysOverdue: new Date(inv.dueDate) < now ? Math.floor((now - dueDate) / MS_PER_DAY) : 0`.

---

### [B-016] `isKit` del producto no se valida antes de guardar kitComponents en quotation
- **Archivo**: `backend/src/routes/quotations.ts` (líneas 146-165)
- **Severidad**: P2 (medio)
- **Descripción**: Al crear una cotización, si se envían `kitComponents` para un item cuyo `productId` no es un kit (`isKit=false`), el sistema los guarda sin validación. Esto crea registros `QuotationItemComponent` huérfanos que no corresponden a ningún BOM real.
- **Evidencia**:
  ```typescript
  // quotations.ts línea 155-165: guarda kitComponents sin verificar product.isKit
  ...(item.kitComponents && item.kitComponents.length > 0
    ? {
        kitComponents: {
          create: item.kitComponents.map((kc) => ({
            componentId: kc.componentId,
            qty: kc.qty,
          })),
        },
      }
    : {}),
  ```
- **Fix sugerido**: Antes de crear la cotización, verificar que cada producto con `kitComponents` tenga `isKit=true` en la DB. Alternativamente, ignorar silenciosamente los `kitComponents` si el producto no es kit.

---

### [B-017] Datos hardcodeados de la empresa en dispatch-pdf-data
- **Archivo**: `backend/src/routes/orders.ts` (líneas 398-406)
- **Severidad**: P2 (medio)
- **Descripción**: Los datos de la empresa (NIT, dirección, teléfono, email, web) están hardcodeados con valores placeholder en el endpoint de datos para PDF de despacho. En producción, el PDF generará datos incorrectos: NIT `'900.XXX.XXX-X'`, teléfono `'+57 300 000 0000'`, etc.
- **Evidencia**:
  ```typescript
  company: {
    name: 'MARAL S.A.S.',
    nit: '900.XXX.XXX-X',           // ← placeholder
    address: 'Bogotá, Colombia',    // ← placeholder
    phone: '+57 300 000 0000',      // ← placeholder
    email: 'ventas@maral.com.co',
    website: 'www.maral.com.co',
  },
  ```
- **Fix sugerido**: Leer estos datos desde variables de entorno (`COMPANY_NIT`, `COMPANY_PHONE`, etc.) o desde una tabla de configuración del sistema en la DB.

---

## NOTAS ADICIONALES DEL AUDITOR

### Schema — Aspectos correctos verificados
- Todas las relaciones bidireccionales están correctamente definidas con `@relation` nombrado en ambos lados (ej: `"OrderUpdater"`, `"ProductionUpdater"`, `"TasksCreated"`, etc.)
- `@@unique([kitId, componentId])` en `ProductComponent` — correcto, previene duplicados en BOM
- `Product.reference` tiene `@unique` — correcto
- `User.email` tiene `@unique` — correcto
- Todos los enums definidos en el schema coinciden con los usados en routes (excepto B-001 y B-002 por inconsistencia frontend)
- Campos requeridos con defaults correctos: `confirmed: Boolean @default(false)`, `active: Boolean @default(true)`, etc.
- `onDelete: Cascade` está correctamente configurado en relaciones hijo (QuotationItem, OrderItem, OrderPhoto, PurchaseItem)

### Flujos verificados como CORRECTOS
- `PUT /purchases/:id/receive`: SÍ actualiza inventario y crea `InventoryMovement` — correcto (ver B-003 para el único issue real)
- `PATCH /production/:id/status`: usa el enum correcto `TERMINADO` en la validación del backend (el problema es el mismatch con el frontend, B-001)
- Soft delete en clientes, productos, suppliers, users — implementado consistentemente con `active: false`
- Paginación con `pageSize || limit` — funciona correctamente en todos los endpoints que lo usan
- Filtro `active: true` aplicado en inventory (`where: { active: true }`) y products (`where: { active }`) — correcto
- `GET /invoices/credit-summary` — cálculo de días de mora correcto, no mezcla períodos

---

AGENTE-B: COMPLETADO
