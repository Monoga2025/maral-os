# QA CONTEXT — MARAL OS

> Generado para el sistema multi-agente de QA. Fecha: 2026-04-01
> PROYECTO: C:\Users\danie\OneDrive\Documentos\Maral\maral-os

---

## STACK TECNOLÓGICO
- **Backend**: Node.js + Express + TypeScript + Prisma 5 + PostgreSQL 16 + JWT + Zod + bcryptjs
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Query + Axios + React Router
- **Deploy**: Docker + EasyPanel

---

## ESTRUCTURA DE CARPETAS

```
maral-os/
├── backend/src/
│   ├── index.ts              ← servidor Express + registro de rutas
│   ├── lib/jwt.ts            ← helpers JWT
│   ├── lib/prisma.ts         ← instancia Prisma
│   ├── middleware/auth.ts    ← middleware autenticación + autorización
│   └── routes/
│       ├── auth.ts, clients.ts, products.ts, quotations.ts
│       ├── orders.ts, inventory.ts, production.ts, purchases.ts
│       ├── suppliers.ts, invoices.ts, dashboard.ts, reports.ts
│       ├── tasks.ts, expenses.ts, users.ts, sync.ts
├── backend/prisma/schema.prisma
├── frontend/src/
│   ├── App.tsx               ← definición de rutas React Router
│   ├── pages/                ← 20 páginas
│   ├── components/ui/        ← 14 componentes reutilizables
│   ├── components/layout/    ← AppLayout, Header, Sidebar
│   ├── lib/api.ts            ← todos los métodos HTTP
│   ├── lib/utils.ts          ← helpers
│   ├── store/auth.ts         ← Zustand store de autenticación
│   ├── store/ui.ts           ← Zustand store de UI
│   └── types/index.ts        ← todos los tipos TypeScript
```

---

## MODELOS PRISMA (schema.prisma)

| Modelo | Campos clave | Relaciones |
|--------|-------------|-----------|
| User | id, name, email, password, role(GERENTE/VENTAS/LOGISTICA), active | quotations, activityLogs, ordersUpdated, productionUpdated, tasksCreated, tasksAssigned, expensesCreated, expensesApproved |
| Client | id, name, company, creditLimit, paymentDays, factoringStatus, category, active | quotations, orders, invoices, tasks |
| Product | id, reference(@unique), name, line, category, priceList, priceDistributor, cost, stock, minStock, unit, isKit | quotationItems, orderItems, inventoryMovements, purchaseItems, productionOrders, kitComponents, usedInKits |
| ProductComponent | id, kitId, componentId, qty, unit | kit(Product), component(Product) — @@unique([kitId,componentId]) |
| Quotation | id, number(autoincrement), clientId, sellerId, status, validityDays, paymentTerms, subtotal, tax, total | client, seller, items, orders |
| QuotationItem | id, quotationId, productId, qty, unitPrice, discount, subtotal | quotation, product, kitComponents |
| QuotationItemComponent | id, quotationItemId, componentId, qty | quotationItem, component |
| Order | id, number, quotationId?, clientId, status, confirmed, recipientName, address, city, phone, carrier, total, updatedById? | client, quotation, updatedBy, items, photos, productionOrders, invoices, tasks |
| OrderItem | id, orderId, productId, qty, unitPrice, picked | order, product |
| OrderPhoto | id, orderId, url, phase?, uploadedAt | order |
| ProductionOrder | id, number, orderId?, productId, qty, phase, assignedTo?, status, requiredDate?, updatedById? | order, product, updatedBy |
| InventoryMovement | id, productId, type, qty, reason?, referenceId?, referenceType? | product |
| Supplier | id, name, contact?, phone?, city?, active | purchaseOrders |
| PurchaseOrder | id, number, supplierId, status, total | supplier, items |
| PurchaseItem | id, purchaseOrderId, productId, qty, unitCost, received | purchaseOrder, product |
| Invoice | id, number, orderId?, clientId, amount, dueDate, paidAt?, status | order, client |
| ActivityLog | id, userId, action, entityType, entityId?, metadata? | user |
| Task | id, title, description?, priority(URGENTE/NORMAL/DESPUES), status(PENDIENTE/EN_PROGRESO/COMPLETADA/CANCELADA), createdById, assignedToId, clientId?, orderId?, dueDate? | createdBy, assignedTo, client, order |
| Expense | id, date, concept, amount, type(CAJA_MENOR/TARJETA), receiptUrl?, createdById, approvedById? | createdBy, approvedBy |

---

## ENDPOINTS BACKEND

### /api/auth
- POST /login → {token, user}
- GET /me → User

### /api/clients
- GET / → PaginatedResponse<Client> (search, category, city, isActive, page, pageSize)
- GET /:id → Client (con stats, cotizaciones, pedidos, facturas)
- POST / → Client
- PUT /:id → Client
- DELETE /:id → soft delete

### /api/products
- GET / → PaginatedResponse<Product>
- GET /low-stock → Product[]
- GET /:id → Product (con movimientos)
- POST / → Product
- PUT /:id → Product
- POST /:id/adjust-stock → {product, movement}
- GET /:id/components → ProductComponent[] (BOM del kit)
- PUT /:id/components → ProductComponent[] (reemplaza toda la receta)

### /api/quotations
- GET / → PaginatedResponse<Quotation>
- GET /:id → Quotation (con items y kitComponents)
- POST / → Quotation (acepta kitComponents por ítem)
- PUT /:id → Quotation
- DELETE /:id → solo si BORRADOR
- POST /:id/convert-to-order → Order (requiere datos de envío)

### /api/orders
- GET /check-duplicate → bool
- GET / → PaginatedResponse<Order> o Kanban groups
- GET /:id → Order completo
- POST / → Order
- PUT /:id → Order
- PATCH /:id/status → Order (graba updatedById)
- POST /:id/photos → multipart/form-data
- GET /:id/dispatch-pdf-data → datos PDF

### /api/inventory
- GET / → PaginatedResponse<Product> con stockStatus
- POST /movement → InventoryMovement
- GET /movements → InventoryMovement[]
- GET /alerts → alertas stock crítico

### /api/production
- GET / → PaginatedResponse<ProductionOrder>
- GET /:id → ProductionOrder (con disponibilidad materiales)
- POST / → ProductionOrder
- PUT /:id → ProductionOrder
- PATCH /:id/status → ProductionOrder

### /api/purchases
- GET / → PaginatedResponse<PurchaseOrder>
- GET /:id → PurchaseOrder completo
- POST / → PurchaseOrder (requiere GERENTE o LOGISTICA)
- PUT /:id/receive → actualiza inventario automáticamente

### /api/invoices
- GET / → PaginatedResponse<Invoice>
- GET /credit-summary → resumen cartera
- GET /:id → Invoice con días de mora calculados
- POST / → Invoice
- PUT /:id/pay → marca pagada

### /api/dashboard
- GET /kpis → DashboardData
- GET /sales-chart → ventas 6 meses
- GET /sales-by-line → por línea/categoría
- GET /alerts → alertas
- GET /activity → últimas 10 actividades

### /api/tasks
- GET / → Task[] (filtrado por rol)
- POST / → Task
- GET /:id → Task
- PUT /:id → Task
- PATCH /:id/status → Task
- DELETE /:id → solo creador o GERENTE

### /api/expenses
- GET / → {data, pagination, totals}
- POST / → Expense
- GET /:id → Expense
- PATCH /:id/approve → solo GERENTE o VENTAS

### /api/users
- GET / → User[] (solo GERENTE)
- POST / → User (solo GERENTE)
- PUT /:id → User (solo GERENTE)
- DELETE /:id → soft delete (solo GERENTE)

### /api/reports
- GET /sales → reporte ventas
- GET /operations → reporte operaciones

---

## PÁGINAS FRONTEND

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| /login | Login.tsx | Autenticación |
| / | Dashboard.tsx | KPIs, gráficos, alertas |
| /clientes | Clients.tsx | Lista clientes |
| /clientes/nuevo | ClientForm.tsx | Crear cliente |
| /clientes/:id | ClientDetail.tsx | Detalle + historial |
| /clientes/:id/editar | ClientForm.tsx | Editar cliente |
| /cotizaciones | Quotations.tsx | Lista cotizaciones |
| /cotizaciones/nueva | QuotationForm.tsx | Crear cotización (3 pasos) |
| /cotizaciones/:id | QuotationForm.tsx | Ver/editar cotización |
| /pedidos | Orders.tsx | Lista + Kanban |
| /pedidos/nuevo | OrderForm.tsx | Crear pedido |
| /pedidos/:id | OrderDetail.tsx | Detalle pedido |
| /inventario | Inventory.tsx | Stock + movimientos |
| /produccion | Production.tsx | Kanban producción |
| /compras | Purchases.tsx | Órdenes de compra |
| /credito | Credit.tsx | Cartera + facturas |
| /catalogo | Catalog.tsx | Catálogo productos |
| /catalogo/nuevo | ProductForm.tsx | Crear producto + BOM kits |
| /catalogo/:id/editar | ProductForm.tsx | Editar producto |
| /reportes | Reports.tsx | Reportes ventas/ops |
| /configuracion | Settings.tsx | Config sistema |
| /manual | Manual.tsx | Ayuda |

---

## ROLES Y PERMISOS

| Recurso | GERENTE | VENTAS | LOGISTICA |
|---------|---------|--------|-----------|
| Todo el sistema | ✓ | — | — |
| Clientes (CRUD) | ✓ | ✓ | — |
| Cotizaciones (CRUD) | ✓ | ✓ | — |
| Pedidos (CRUD) | ✓ | ✓ | ✓ (ver+estado) |
| Producción | ✓ | — | ✓ |
| Inventario | ✓ | — | ✓ |
| Compras | ✓ | — | ✓ |
| Cartera/Crédito | ✓ | ✓ (ver) | — |
| Reportes | ✓ | ✓ | — |
| Usuarios (CRUD) | ✓ | — | — |
| Tareas (propias) | ✓ | ✓ | ✓ |
| Tareas (todas) | ✓ | — | — |
| Gastos (aprobar) | ✓ | ✓ | — |
| Gastos (crear) | ✓ | ✓ | ✓ |

---

## FLUJOS CRÍTICOS A VERIFICAR

1. **Login → Dashboard**: autenticación JWT, carga KPIs
2. **Crear cotización**: 3 pasos (cliente → productos → condiciones), soporte kits con BOM
3. **Cotización → Pedido**: convert-to-order, datos heredados
4. **Cambio de estado pedido**: auditoría updatedById
5. **Compra → Recepción**: actualización automática de inventario
6. **Crear factura desde pedido**: vinculación Order↔Invoice
7. **Pago de factura**: actualiza status, registra paidAt
8. **Kit con BOM**: componentes se guardan en QuotationItemComponent
9. **Tarea asignada**: filtrado por rol correcto
10. **Aprobación de gasto**: solo GERENTE/VENTAS

---

## BUGS CONOCIDOS (P0) DOCUMENTADOS EN AGENT_LOG

- Mismatch de enums frontend/backend (ProductionStatus: frontend usa 'COMPLETADO', backend usa 'TERMINADO')
- InvoiceStatus: frontend puede usar 'PENDIENTE', backend usa 'VIGENTE'
- JWT Secret puede tener fallback hardcodeado en jwt.ts
- Parámetro de paginación inconsistente (pageSize vs limit)
- Frontend NO restringe vistas por rol (solo el backend lo hace)
- quotationsApi.convertToOrder envía a /quotations/:id/convert pero el backend escucha en /quotations/:id/convert-to-order
