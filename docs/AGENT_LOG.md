# AGENT_LOG.md — Bitácora cronológica de MARAL OS

> Registro global de sesiones, hallazgos, cambios y decisiones.
> Cada entrada debe incluir: fecha, rol del agente, qué se hizo, qué se encontró, qué sigue.

---

## Formato de entrada

```
## [FECHA] — [ROL DEL AGENTE] — [Resumen en una línea]

### Qué se hizo
- ...

### Hallazgos importantes
- ...

### Cambios realizados
- ...

### Riesgos identificados
- ...

### Próximos pasos
- ...
```

---

## 2026-05-13 — OpenCode — Variables compartidas entre módulos core

### Qué se hizo
- Se corrigieron cortes de datos entre Clientes, Cotizaciones, Pedidos, Producción, Crédito, Inventario, Campañas y Tareas.
- Se usaron subagentes de exploración para auditar flujo core, segmentación/categorías/etiquetas y contratos frontend/backend.

### Hallazgos importantes
- `GET /api/quotations` no devolvía dirección/teléfono del cliente, por eso la conversión a pedido abría datos vacíos.
- Clientes filtraba etiquetas con `interestTags`, mientras campañas y asignación masiva usan `Tag` + `ClientTag`.
- Segmentos y categorías tenían CRUD dinámico, pero Clientes seguía con listas hardcodeadas.
- Descuento de cotización se perdía al convertir a pedido porque se copiaba `unitPrice` bruto.
- Producción recibía nombres (`Angelo`, `Iván`) en un campo que Prisma relaciona contra `User.id`.
- Cartera no se alimentaba automáticamente desde pedidos a crédito despachados.

### Cambios realizados
- `backend/src/routes/clients.ts`: filtros `segment`/`tagId`, select completo de cliente, `previousNames`, validación de segmentos.
- `backend/src/routes/quotations.ts`: filtro `clientId`, select de cliente completo, conversión con fallback de dirección/teléfono, `sourceCampaignId`, `confirmed`, precio final con descuento.
- `backend/src/routes/orders.ts`: `dispatchDate`, `dianInvoiceNumber`, despacho a crédito crea/actualiza factura interna, disposición `PRODUCCION` crea OP vinculada.
- `backend/src/routes/production.ts`: filtro por asignado y sincronización de pedido a `EMPACADO` cuando todas las OP vinculadas terminan.
- `backend/src/routes/invoices.ts`: actualización automática de facturas vencidas al consultar cartera.
- `backend/src/lib/audience-query.ts` y `backend/src/routes/campaigns.ts`: audiencias soportan `categories`; Marco acepta segmentos dinámicos.
- `backend/src/lib/image-gen.ts`: modelo de imagen cambiado a `google/gemini-2.5-flash-image-preview`.
- `backend/prisma/schema.prisma`: agregados `Client.previousNames` y `Order.dianInvoiceNumber`.
- `frontend/src/lib/api.ts`, `frontend/src/lib/contracts.ts`, `frontend/src/types/index.ts`: contratos actualizados para que variables viajen tipadas.
- `frontend/src/pages/Clients.tsx`: categorías/segmentos/etiquetas dinámicas, filtro real por etiqueta, edición inline de categoría.
- `frontend/src/pages/ClientForm.tsx` y `ClientDetail.tsx`: captura y visualización de nombres anteriores.
- `frontend/src/pages/Quotations.tsx`: tab Todas, transportadora Cualquiera, descarga PDF real con nombre `numero_cliente.pdf`.
- `frontend/src/pages/QuotationForm.tsx`: aviso de salida sin guardar.
- `frontend/src/pages/OrderForm.tsx`: transportadora Cualquiera.
- `frontend/src/pages/OrderDetail.tsx`: despacho a crédito y OP con usuarios reales.
- `frontend/src/pages/Production.tsx`: asignación con usuarios reales.
- `frontend/src/pages/Inventory.tsx`: KPIs filtrables, edición rápida de stock y mínimo.
- `frontend/src/pages/CampaignWizard.tsx`: categorías en audiencia y generación de imágenes activada.
- `frontend/src/pages/Tareas.tsx` y `backend/src/routes/tasks.ts`: mensaje/estado por tarea editable por creador/asignado.

### Riesgos identificados
- Cambios de schema fueron aplicados con `prisma db push`; para producción conviene crear migración formal antes de deploy.
- Fragmentación de pedidos requiere modelo dedicado; no se implementó en esta tanda porque cambia arquitectura de pedidos/despachos.
- Ocultamiento completo de valores para LOGISTICA debe reforzarse en backend con serialización por rol antes de producción.

### Próximos pasos
- Crear migración formal Prisma.
- Implementar modelo de fragmentos/envíos parciales.
- Reforzar permisos/serialización para ocultar precios a logística.
- Probar flujo manual: cliente -> cotización -> pedido -> producción -> despacho crédito -> cartera.

---

## 2026-04-20 — Claude Code — Módulo cotizaciones: HTML render, firma, guía de envío, numeración

### Qué se hizo
Rediseño completo del generador de cotizaciones a HTML+CSS (imprimible como PDF desde navegador). Correcciones múltiples al módulo solicitadas por John.

### Cambios realizados
- `backend/src/routes/quotations.ts`: Nueva ruta `GET /:id/html` que retorna HTML estilizado autocontenido. Firma/footer corregida al orden exacto solicitado. REMITE: Nombre, NIT, Dirección, Tel, Email, Ciudad. DESTINO: Nombre, NIT, Dirección, Tel, Email, Ciudad. PDFKit: nombres largos wrap en lugar de ellipsis.
- `backend/src/middleware/auth.ts`: Acepta token también en query param `?token=` (necesario para abrir HTML en nueva pestaña del navegador).
- `frontend/src/lib/api.ts`: `viewPDF` y `downloadPDF` ahora abren la ruta HTML en nueva pestaña.
- `backend/src/assets/` creado — colocar logo en `backend/src/assets/logo.png`.
- Secuencia `Quotation_number_seq` reseteada a 4518 → próxima cotización = 4519.

### Próximos pasos
- John debe copiar el logo PNG a `backend/src/assets/logo.png`
- Deploy en EasyPanel con nuevo código

## 2026-04-15 — QA humano + agente — 15 bugs UI corregidos + tours para Tareas y Gastos

### Qué se hizo
Usuario reportó auditoría exhaustiva con 24 bugs/mejoras (7 críticos, 11 moderados, 8 UX). Se corrigieron 15 con cambios quirúrgicos y se expandió el sistema de tours a los módulos Tareas y Gastos.

### Hallazgos importantes
- Frontend consumía respuestas del backend con shape incorrecto en varias páginas: `data.total` vs `data.pagination.total`, `items.length` vs `_count.items`, `dataKey="revenue"` vs `amount`. Patrón repetitivo que sugiere ausencia de tipos compartidos estrictos.
- Logs de actividad se mostraban en inglés porque el backend concatenaba enum crudo (`CREATE en Quotation`).
- Overlay del tour bloqueaba clicks cuando no encontraba el `data-tour` target (olvido de `pointer-events-none`).
- Welcome modal no cerraba con Escape — primera queja de UX.

### Cambios realizados
**Bugs (commit `6709dfe`):**
- `Header.tsx`: cuid2 detection `length >= 20`.
- `Clients.tsx`: `pagination.total`.
- `Orders.tsx`: filter CANCELADO, `_count.items`.
- `Quotations.tsx`: eliminar RECHAZADA, guardia validUntil.
- `Reports.tsx`: `dataKey="amount"`, query `opsData`, empty-state ops.
- `Purchases.tsx`: `_count.items`, color neutro.
- `Production.tsx`: `ASSIGNEES.includes(...)`.
- `Inventory.tsx`: criterio crítico/mínimo alineado con backend.
- `backend/src/routes/dashboard.ts`: maps español para actividad.

**Tours (commit pendiente):**
- `TourProvider.tsx`: Escape cierra tour/welcome y marca como visto.
- `TourOverlay.tsx`: `pointer-events-none` en fallback; rutas `tareas` y `gastos`.
- `tours.ts`: tours `tareas` (4 pasos) y `gastos` (3 pasos).
- `Tareas.tsx` y `Gastos.tsx`: `TourButton` + `data-tour` attrs.

**Docs:**
- `CLAUDE.md`: sección "Estado al 2026-04-15" con convenciones de respuesta backend.

### Riesgos identificados
- Varios campos del API se accedían con cast `as any` para sortear tipos desactualizados. Deuda: regenerar types desde contracts o schema.
- Seed de Producción guarda `assignedTo` como ID de usuario, pero el formulario usa nombres. El parche es defensivo (`ASSIGNEES.includes`), no reseedea.

### Próximos pasos
- Bugs arquitectónicos pendientes: `findByNumber` para URLs con número secuencial, reseed pedido #7 total $0, confirmar estado buscador ⌘K y notificaciones.
- Ejecutar QA ciclo completo (`qa-orchestrator`) para validar no regresiones.
- Deploy a EasyPanel con los 15 fixes.

---

## 2026-04-06 (sesión 2) — Agente de producto — GAP-06 Tareas, GAP-10 Gastos, GAP-02 Auditoría, GAP-01 Disposición ítems, GAP-11 Merlin AHK

### Qué se hizo

**1. GAP-06 — Página /tareas (agente paralelo)**
- Creado `frontend/src/pages/Tareas.tsx`: filtros por estado/prioridad, cards con badges, modal de creación, marcar completo, eliminar
- Agregada ruta `tareas` en `App.tsx` y enlace en `Sidebar.tsx` (icono CheckSquare)

**2. GAP-10 — Página /gastos (agente paralelo)**
- Creado `frontend/src/pages/Gastos.tsx`: resumen cards (Caja Menor/Tarjeta/Total), tabla con tipo/monto/aprobación, filtros fecha+tipo, paginación
- Modal de registro (date/concept/amount/type), botón Aprobar solo para GERENTE
- Agregada ruta `gastos` en `App.tsx` y enlace en `Sidebar.tsx` (icono Receipt)

**3. GAP-02 — Auditoría de quién avanzó el estado del pedido**
- Backend: `GET /api/orders/:id` ahora incluye `updatedBy: { id, name }` (el schema ya tenía el campo, el PATCH/:id/status ya guardaba updatedById)
- Frontend: `Order.updatedBy` agregado a `types/index.ts`
- UI: `OrderDetail.tsx` muestra "Avanzado por [nombre] el [fecha]" junto al header del pedido

**4. GAP-01 — Disposición por ítem (Stock vs. Producción)**
- Schema: nuevo enum `ItemDisposition { PENDIENTE, STOCK, PRODUCCION }` y campo `OrderItem.disposition @default(PENDIENTE)`
- `npm run db:push` aplicado exitosamente
- Backend: nuevo endpoint `PATCH /api/orders/:id/items/:itemId/disposition`
- Frontend: `ItemDisposition` type + `OrderItem.disposition` en `types/index.ts`, `ordersApi.updateItemDisposition()` en `api.ts`
- UI: cada ítem en `OrderDetail.tsx` tiene 3 botones toggle (Pendiente/Stock/Producción) que persisten en DB

**5. GAP-11 — AutoHotkey para Merlin**
- Creado `tools/merlin_launcher.ahk`: script AHK v2 que abre/activa Merlin y busca al cliente por merlinCode. Tiene TODO claro para adaptar los keystrokes una vez que se mapee la UI de Merlin.
- Nuevo `backend/src/routes/merlin.ts`: `POST /api/merlin/open-client` lanza el script AHK via `child_process.spawn` (detached). En producción retorna 503.
- Registrado en `backend/src/index.ts` como `/api/merlin`
- Frontend: `merlinApi.openClient()` en `api.ts`, botón "Merlin" (ExternalLink icon) en `OrderDetail.tsx` — visible solo si `client.merlinCode` existe
- `Client.merlinCode` agregado a `types/index.ts`

### Cambios realizados

| Archivo | Tipo | GAP |
|---------|------|-----|
| `frontend/src/pages/Tareas.tsx` | Nuevo | GAP-06 |
| `frontend/src/pages/Gastos.tsx` | Nuevo | GAP-10 |
| `frontend/src/App.tsx` | Modificado | GAP-06 + GAP-10 |
| `frontend/src/components/layout/Sidebar.tsx` | Modificado | GAP-06 + GAP-10 |
| `backend/prisma/schema.prisma` | Modificado | GAP-01 |
| `backend/src/routes/orders.ts` | Modificado | GAP-02 + GAP-01 |
| `backend/src/routes/merlin.ts` | Nuevo | GAP-11 |
| `backend/src/index.ts` | Modificado | GAP-11 |
| `tools/merlin_launcher.ahk` | Nuevo | GAP-11 |
| `frontend/src/types/index.ts` | Modificado | GAP-02 + GAP-01 + GAP-11 |
| `frontend/src/lib/api.ts` | Modificado | GAP-01 + GAP-11 |
| `frontend/src/pages/OrderDetail.tsx` | Modificado | GAP-02 + GAP-01 + GAP-11 |

### Estado de los GAPs implementados

| GAP | Estado anterior | Estado ahora |
|-----|----------------|--------------|
| GAP-06 Tareas | ✅ Backend | ✅ Full stack |
| GAP-10 Gastos | ✅ Backend | ✅ Full stack |
| GAP-02 Auditoría pedido | ⚠️ Parcial (schema+backend) | ✅ Full stack |
| GAP-01 Disposición ítems | 🔲 Pendiente | ✅ Full stack |
| GAP-11 AutoHotkey Merlin | 🔲 Pendiente | ⚠️ Parcial (script plantilla — keystrokes de Merlin pendiente de mapear) |

### Pendiente de acción manual
- `tools/merlin_launcher.ahk`: adaptar los keystrokes en la sección TODO según la UI real de Merlin 4.8 (usar Window Spy / AHK Recorder)
- Reiniciar backend para que el Prisma client regenerado tome el nuevo enum `ItemDisposition`

### Próximos pasos sugeridos
- GAP-03: Sugerencia automática stock/producción al convertir cotización a pedido
- GAP-05: Descuento automático en kits
- Deploy EasyPanel con `prisma migrate deploy` + configurar COMPANY_* vars

---

## 2026-04-06 — Agente de producto — PDF de cotización, modo edición, campo shippingAddress

### Contexto de la sesión
Continuación del estado al 2026-04-05 documentado en CLAUDE.md. El sistema corre localmente sin Docker (PostgreSQL nativo Windows :5432, backend :3001, frontend :5173). La integración con Merlin está definida como **solo lectura** (sync de clientes y productos desde Merlin hacia MARAL OS — nunca escritura). La factura electrónica DIAN la genera el contador manualmente en Merlin.

### Qué se hizo

**1. PDF de cotización profesional (pdfkit)**
- Nuevo endpoint `GET /api/quotations/:id/pdf` en `backend/src/routes/quotations.ts`
- Diseño Letter (612×792 pts), paleta azul oscuro `#1e3a5f`
- Función `drawQuotationPDF`: header empresa + badge cotización, sección cliente/condiciones en 2 columnas, tabla de ítems con 8 columnas (filas alternas, descuentos en rojo), bloque de totales (subtotal + IVA + TOTAL), notas, footer con vigencia, franja de marca
- Función `drawShippingLabel`: etiqueta de envío tipo courier — REMITE (datos Maral fijos), línea punteada de corte "CORTAR AQUÍ", DESTINO (empresa/nombre del cliente en 14pt bold, NIT/CC, dirección de envío, ciudad/departamento, teléfono)
- Datos de la empresa leídos desde variables de entorno (`COMPANY_NAME`, `COMPANY_NIT`, `COMPANY_ADDRESS`, `COMPANY_PHONE`, `COMPANY_EMAIL`, `COMPANY_WEBSITE`)
- City corregida: `'Curití, Santander'` (estaba como `'Bogotá, Colombia'`)
- Logo placeholder: caja azul oscuro rellena con monograma "M" blanco — aislado del texto de la empresa para evitar solapamiento
- Page break automático en tabla si la cotización tiene muchos ítems
- Paginación inteligente para la etiqueta: nueva página si quedan menos de 230pt
- `quotationsApi.downloadPDF(id, number)` en `frontend/src/lib/api.ts`: fetch con JWT → blob → descarga automática `COT-00001.pdf`
- Botón Download (ícono azul) en cada fila de `Quotations.tsx`

**2. Campo shippingAddress**
- `shippingAddress String?` agregado al modelo `Quotation` en `schema.prisma`
- Aplicado con `prisma db push` (sin migración formal — desarrollo)
- Campo agregado al zod schema en el backend (opcional, pasa por `...rest` en create/update)
- `shippingAddress?: string` agregado a `CreateQuotationRequest` en `contracts.ts` y a la interfaz `Quotation` en `types/index.ts`
- En la etiqueta PDF: dirección usa `q.shippingAddress || cl.address` — prioridad al campo de la cotización

**3. Modo edición de cotizaciones (QuotationForm.tsx)**
- `useParams` detecta `:id` en la URL → activa `isEditMode`
- `useQuery(['quotation', id])` carga la cotización existente
- `useEffect` (con flag `initialized` para no re-ejecutar) puebla: `selectedClient`, `items` (conversión `QuotationItem[]` → `LineItem[]`), `applyTax`, y todos los campos del form con `reset()`
- En modo edición arranca en Step 2 (productos ya cargados, no pierde tiempo en Step 1)
- Campo "Dirección de envío" en Step 3 — prellenado automáticamente con `client.address` al seleccionar cliente (solo si el campo está vacío)
- Botón "Guardar cambios" en modo edición → `quotationsApi.update(id, payload)`
- Breadcrumb muestra "Editar Cotización # 00001" en modo edición
- Nueva ruta `cotizaciones/:id/editar` en `App.tsx` → mismo componente `QuotationForm`
- Ruta `cotizaciones/:id` existente también activa modo edición (row click ya funciona)

**4. Botón Editar en lista de cotizaciones**
- Ícono `Pencil` (lucide-react) añadido a `Quotations.tsx`
- Visible para estados: `BORRADOR`, `ENVIADA`, `APROBADA`, `RECHAZADA`
- Oculto para: `CONVERTIDA`
- Navega a `/cotizaciones/:id/editar`
- Posición en fila de acciones: entre "Convertir a pedido" y "Descargar PDF"

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `backend/prisma/schema.prisma` | Campo `shippingAddress String?` en `Quotation` |
| `backend/src/routes/quotations.ts` | Endpoint PDF, `drawQuotationPDF`, `drawShippingLabel`, zod schema |
| `frontend/src/lib/contracts.ts` | `shippingAddress` en `CreateQuotationRequest` |
| `frontend/src/lib/api.ts` | `quotationsApi.downloadPDF()` |
| `frontend/src/types/index.ts` | `shippingAddress` en interfaz `Quotation` |
| `frontend/src/App.tsx` | Ruta `cotizaciones/:id/editar` |
| `frontend/src/pages/QuotationForm.tsx` | Modo edición completo + campo shippingAddress |
| `frontend/src/pages/Quotations.tsx` | Botón Editar (Pencil) + botón Download |

### Decisiones arquitectónicas
- PDF generado en backend (pdfkit, Node.js) — no en el browser. Razón: el frontend no tiene acceso a fuentes del sistema ni a datos completos en una sola llamada. El endpoint PDF hace la query de datos y genera el stream en una sola solicitud autenticada.
- `shippingAddress` se guarda en la cotización (no solo en el cliente) porque la dirección de entrega puede diferir de la dirección registrada del cliente (bodega, obra, sucursal).
- Modo edición reutiliza `QuotationForm` con `useParams` en lugar de un componente separado. El flag `initialized` previene que el `useEffect` re-ejecute si React Query refetch.
- El cliente NO se puede cambiar en una edición (el backend ignora `clientId` en updates). Esto es intencional — cambiar el cliente implicaría recalcular historial, crédito, etc.

### Riesgos y limitaciones conocidas
- `db:push` en vez de migración formal — aceptable en desarrollo, pero al hacer deploy a EasyPanel hay que correr `prisma migrate deploy` para que el campo quede registrado como migración versionada
- El PDF usa fuentes Helvetica (built-in pdfkit). Cuando se tenga el logo PNG real de Maral, reemplazar el placeholder (caja azul con "M") con `doc.image(logoPath, x, y, { width: 100 })`
- La etiqueta de remite tiene la dirección y teléfono hardcodeados ("Calle 3 # 6A-22 Piso 1" y "3167760692"). Considerar moverlos a variables de entorno como `COMPANY_ADDRESS_FORMATTED`

### Estado del sistema (2026-04-06)
- Backend: :3001, sin errores TypeScript
- Frontend: :5173, errores TS pre-existentes en `ClientDetail.tsx`, `Clients.tsx`, `OrderDetail.tsx` (no son de esta sesión)
- PostgreSQL nativo Windows :5432, DB: `maral_os`
- Campo `shippingAddress` en DB ✓
- PDF de cotización funcional ✓
- Modo edición de cotizaciones funcional ✓

### Pendiente — PRÓXIMAS SESIONES

**🔴 PENDIENTE: Deploy EasyPanel**
- El código en producción está desactualizado (da 404 en `/api/users`, `/api/tasks`, `/api/expenses`)
- Antes del deploy: correr `prisma migrate deploy` (no `db:push`) para versionar `shippingAddress` y demás campos del QA de abril
- Variables de entorno de empresa (`COMPANY_*`) deben estar configuradas en EasyPanel
- Ejecutar `sync_maral.py` para poblar `merlinCode` en los 853 clientes antes o después del deploy

**🟡 PENDIENTE: AutoHotkey para Merlin**
- Automatización de apertura/cierre de Merlin desde MARAL OS mediante AutoHotkey
- Permitiría al usuario abrir el registro del cliente en Merlin con un click desde la ficha de MARAL OS
- Requiere: identificar ventana de Merlin por título, enviar keystrokes, mapear `merlinCode` del cliente al campo de búsqueda de Merlin
- No bloqueante — Merlin sigue siendo solo lectura desde MARAL OS

**🟡 PENDIENTE: Logo real de Maral en el PDF**
- Reemplazar placeholder "M" azul con `doc.image(logoPath, ...)` en `drawQuotationPDF`
- El logo debe estar accesible desde el backend en un path fijo (ej: `backend/assets/logo.png`)

**🟡 PENDIENTE: sync_maral.py — poblar merlinCode**
- 853 clientes importados de Merlin no tienen `merlinCode` aún
- Correr `python sync_maral.py` desde `C:\Users\danie\OneDrive\Desktop\Merlin\`
- Verificar que la bidireccionalidad Merlin → MARAL OS funcione post-deploy

---

## 2026-04-01/02 — QA Orchestrator — Ciclo QA completo: 38 bugs encontrados, 25 corregidos, 25/25 verificados

### Qué se hizo
- Ciclo QA completo con 6 agentes especializados (bug-explorer, data-auditor, ui-auditor, bug-fixer, qa-verifier)
- Auditoría de 14 rutas backend, schema Prisma completo, 18 páginas frontend
- 38 bugs documentados en `.claude/qa-session/bugs-priorizado.md`
- 25 correcciones aplicadas en 15 archivos
- 25/25 verificaciones pasadas por qa-verifier

### Cambios realizados
- **Schema**: QuotationStatus (APROBADA/RECHAZADA/CONVERTIDA), PurchaseStatus+PARCIAL, onDelete constraints, @@index en Invoice y ActivityLog
- **Backend routes**: orders (updatedById + dispatch-pdf pdfkit), quotations (kitComponents include, transaction, status CONVERTIDA), purchases (PARCIAL), invoices (sin updateMany, daysOverdue correcto), dashboard (Promise.all, updatedAt, APROBADA), production (N+1 → findMany+Map)
- **Frontend**: api.ts (URL fix), utils.ts (enums correctos), types/index.ts (sincronizado con schema), OrderDetail.tsx (null check)
- **Seed**: orden FK-safe con task/expense/quotationItemComponent/productComponent antes de parents
- **package.json**: pdfkit añadido

### Hallazgos críticos
- P0-1: `convertToOrder` era 404 (URL incorrecta) — corregido
- P0-4: BOM de kits se perdía al convertir cotización a pedido — corregido
- P1-9: GET /invoices ejecutaba updateMany como side effect — corregido
- P1-11/12: N+1 queries en producción y dashboard — corregidos

### Pendiente (requiere acción manual)
1. `cd backend && npm install` — instalar pdfkit
2. `cd backend && npm run db:push` — aplicar schema a DB
3. Variables de entorno: COMPANY_NAME, COMPANY_NIT, COMPANY_ADDRESS, COMPANY_PHONE, COMPANY_EMAIL, COMPANY_WEBSITE

### Reporte completo
`docs/REPORTS/QA-REPORT-2026-04-01.md`

---

## 2026-04-01 — Backend + Frontend Agent — Kits dinámicos, auditoría, tareas y gastos

### Qué se hizo
- Diagnóstico completo del codebase (15 modelos Prisma, 14 rutas Express, 18 páginas React)
- Integración de documento de requerimientos de 11 módulos al ROADMAP

### Cambios realizados
**Schema (backend/prisma/schema.prisma):**
- Nuevo modelo `ProductComponent` — BOM (receta) de kits
- Nuevo modelo `QuotationItemComponent` — overrides de componentes por cotización
- Campo `isKit Boolean @default(false)` en `Product`
- Campo `updatedById String?` en `Order` y `ProductionOrder` — auditoría de cambios
- Nuevo modelo `Task` — tareas internas (URGENTE/NORMAL/DESPUES)
- Nuevo modelo `Expense` — caja menor (CAJA_MENOR/TARJETA)
- Nuevos enums: `TaskPriority`, `TaskStatus`, `ExpenseType`

**Backend:**
- `routes/products.ts`: Endpoints GET/PUT `/:id/components` (gestión BOM)
- `routes/quotations.ts`: Soporte de `kitComponents` por ítem en POST/PUT/GET
- Nuevo `routes/tasks.ts`: CRUD completo + PATCH status, autorización por rol
- Nuevo `routes/expenses.ts`: CRUD + aprobación, visibilidad por rol
- `index.ts`: Registradas rutas `/api/tasks` y `/api/expenses`

**Frontend:**
- `types/index.ts`: `ProductComponent`, `QuotationItemComponent`, `Task`, `Expense`, `isKit` en Product
- `lib/api.ts`: `productsApi.getComponents/setComponents`, `tasksApi`, `expensesApi`
- `pages/ProductForm.tsx`: Toggle isKit + editor de BOM con búsqueda de componentes
- `pages/QuotationForm.tsx`: Modal `KitEditor` al agregar kit, row de componentes en tabla

**Docs:**
- `ROADMAP.md`: Reestructurado con 10 fases cubriendo los 11 módulos del documento de requerimientos

### Próximos pasos
- `prisma migrate dev --name kits-tasks-expenses` para aplicar el schema
- Páginas frontend: `/tareas` y `/gastos`
- Endpoint PATCH `/orders/:id/status` que grabe `updatedById`
- Descuento automático de insumos al confirmar producción (BOM → inventory)

---

## 2026-03-31 — Agente arquitecto/diagnóstico — Diagnóstico inicial y creación de estructura de documentación

### Qué se hizo
- Análisis completo del codebase: backend, frontend, prisma schema, rutas, páginas, store, tipos
- Identificación de inconsistencias técnicas críticas
- Creación de toda la estructura de documentación del proyecto

### Hallazgos importantes

**Positivos:**
- El sistema está sustancialmente construido. Los 10 módulos core tienen lógica de backend y páginas de frontend.
- Stack moderno y coherente: React 18, Express, Prisma, PostgreSQL, Tailwind.
- Modelo de datos bien diseñado: 14 entidades con relaciones correctas.
- ActivityLog implementado para trazabilidad básica.
- Autenticación JWT funcionando con roles.

**Problemas críticos (P0):**
1. **Mismatch de enums entre frontend y backend** — Los valores de `ProductLine`, `ProductionPhase`, `InvoiceStatus`, `UserRole` son diferentes en `frontend/src/types/index.ts` vs `backend/prisma/schema.prisma`. Genera bugs silenciosos de visualización.
   - ProductLine frontend: ESTACION_BASE, MOVIL, HANDY, CABLES... | Backend: ESTANDAR, PREMIUM
   - ProductionPhase frontend: CORTE, ENSAMBLE, SOLDADURA... | Backend: BASICO, PREENSAMBLE, ENSAMBLE_FINAL
2. **JWT Secret hardcodeado:** `backend/src/lib/jwt.ts` usa `'fallback-secret-change-in-production'` si `JWT_SECRET` no está en el entorno.

**Problemas P1:**
- No existe CRUD de usuarios en la UI ni en el API (solo seed)
- Página de Configuración sin backend
- Módulo Sync es un esqueleto (estado en memoria, no persistente)
- Sin logging de requests API
- Inconsistencia de parámetros de paginación (`pageSize` vs `limit`)

**Módulos incompletos:**
- `sync.ts` — esqueleto sin funcionalidad real
- Reports — básico, sin exportación ni filtros avanzados
- Settings — UI sin backend
- Manual — UI sin contenido

### Cambios realizados
- Creado `CLAUDE.md` (raíz) — reglas permanentes para todos los agentes
- Creado `docs/PROJECT_MASTER.md` — visión, estado actual, problemas conocidos
- Creado `docs/ARCHITECTURE.md` — arquitectura actual y objetivo
- Creado `docs/DOMAIN_MODEL.md` — entidades, relaciones, ciclos de vida
- Creado `docs/ROADMAP.md` — fases priorizadas por impacto de negocio
- Creado `docs/AGENT_LOG.md` — este archivo
- Creados handoffs: backend-agent, frontend-agent, ui-agent, ops-agent
- Creadas decisions: ADR-001, ADR-002
- Creados módulos: crm, quotes, orders, production, inventory, cartera

### Riesgos identificados
- Los enum mismatches pueden estar causando bugs ya en producción sin que nadie lo sepa
- El JWT fallback expone el sistema si se deployan contenedores sin configurar bien el .env
- Sin tests, cualquier refactor puede romper comportamientos no documentados

### Próximos pasos recomendados
1. Corregir enum mismatches (P0) — Ver `docs/HANDOFFS/backend-agent.md`
2. Agregar logging de requests al backend
3. Implementar CRUD de usuarios
4. Completar backend de Settings
5. Mejorar pipeline de cotizaciones (impacto directo en ventas)

---

## 2026-03-31 — Agente de pulido — Corrección de bugs P0/P1, tipos, seguridad y roles

### Qué se hizo
- Revisión completa de todos los archivos fuente (backend + frontend)
- Corrección de todos los mismatch de enums entre frontend y backend
- Corrección del bug de seguridad JWT
- Implementación de CRUD de usuarios en backend
- Implementación de logging de requests en backend
- Corrección de restricción de vistas por rol en Sidebar
- TypeScript limpio en ambos lados (0 errores `tsc --noEmit`)

### Cambios realizados

**backend/src/lib/jwt.ts**
- Eliminado fallback hardcodeado `'fallback-secret-change-in-production'`
- Ahora lanza error al arrancar si `JWT_SECRET` no está configurado
- Fix de tipado TypeScript para que el narrowing funcione correctamente

**backend/src/index.ts**
- Agregado middleware de logging de requests (método, ruta, status, ms, userId)
- Registrada nueva ruta `/api/users`

**backend/src/routes/users.ts** (nuevo)
- CRUD completo: GET /, GET /:id, POST /, PUT /:id, DELETE /:id
- Todos los endpoints protegidos con `authenticate` + `requireRole('GERENTE')`
- Soft delete (campo `active = false`)
- Nunca devuelve el campo `password`
- Registra en `ActivityLog` en create, update y deactivate
- Validación con Zod
- Prevención de auto-desactivación

**frontend/src/types/index.ts**
- `UserRole`: eliminado `'ADMIN'` (no existe en DB)
- `ProductLine`: corregido a `'ESTANDAR' | 'PREMIUM'` (alineado con schema)
- `ProductCategory`: agregado tipo nuevo con valores correctos del schema
- `ProductionStatus`: corregido `COMPLETADO → TERMINADO`, `CANCELADO → EMPACADO`
- `ProductionPhase`: corregido a `BASICO | PREENSAMBLE | ENSAMBLE_FINAL`
- `InvoiceStatus`: corregido a `VIGENTE | VENCIDA | PAGADA`
- `MovementType`: agregado `DEVOLUCION`
- `Product.line`: tipado como `ProductLine` (antes `string`)
- `Product.category`: tipado como `ProductCategory` (antes `string`)

**frontend/src/components/ui/StatusBadge.tsx**
- `productionStatusMap`: corregido a `TERMINADO` y `EMPACADO`
- `invoiceStatusMap`: corregido a `VIGENTE`, eliminado `PENDIENTE` y `ANULADA`
- `factoringStatusMap`: eliminados valores inexistentes (`ACTIVO`, `INACTIVO`, `PENDIENTE`)
- `productLineMap`: corregido a `ESTANDAR` y `PREMIUM`

**frontend/src/components/layout/Sidebar.tsx**
- Eliminado `ADMIN` de todos los arrays `roles` y de `roleLabels`
- Agregadas restricciones explícitas por rol en todos los ítems del menú:
  - Producción, Inventario, Compras: solo GERENTE + LOGISTICA
  - Pedidos: GERENTE + VENTAS + LOGISTICA
  - Clientes, Cotizaciones, Crédito, Catálogo: GERENTE + VENTAS
  - Reportes, Configuración: solo GERENTE

**frontend/src/pages/Dashboard.tsx**
- `lineLabels`: corregido a `ESTANDAR` y `PREMIUM`

**frontend/src/pages/ProductForm.tsx**
- Importados tipos `ProductLine` y `ProductCategory`
- `FormData.line` tipado como `ProductLine`
- `FormData.category` tipado como `ProductCategory`

**frontend/src/components/ChatBot.tsx**
- Actualizados todos los enum values en el system prompt del asistente

**frontend/src/pages/Manual.tsx**
- Actualizadas fases de producción (BASICO, PREENSAMBLE, ENSAMBLE_FINAL)
- Actualizados estados de producción (TERMINADO, EMPACADO)
- Actualizado factoring status

### Resultado
- `tsc --noEmit` pasa en CERO errores tanto en frontend como en backend
- Los enums están alineados entre tipos TypeScript y schema Prisma
- El sistema arranca de forma segura (falla explícitamente si falta JWT_SECRET)
- La interfaz respeta los roles correctamente

### Riesgos eliminados
- Bug silencioso de enums que podía hacer que filtros retornaran 0 resultados
- Riesgo de seguridad JWT con secret predecible
- ADMIN role referenciado en frontend sin existir en DB

### Próximos pasos recomendados
1. Agregar página de administración de usuarios en el frontend (conectar a /api/users)
2. Implementar backend de la página de Configuración
3. Mejorar pipeline de cotizaciones (tiempo en estado, alertas de seguimiento)
4. Configurar backup automático de PostgreSQL en EasyPanel

## 2026-04-15 — bug-fixer — Resolución por número secuencial en Pedidos y Cotizaciones

### Qué se hizo
- Añadido `router.param('id', ...)` en `orders.ts` y `quotations.ts`: si el parámetro es un número entero (`/^\d+$/`), el backend busca por `number` (autoincrement) y sustituye `req.params.id` con el CUID real antes de que llegue al handler.

### Cambios realizados
- `backend/src/routes/orders.ts`: import `NextFunction`; `router.param` resuelve número → CUID
- `backend/src/routes/quotations.ts`: ídem

### Resultado
- `/pedidos/7` y `/cotizaciones/8` ahora devuelven el recurso correcto en lugar de 404/formulario vacío.
- Compatible hacia atrás: los CUIDs siguen funcionando sin cambio.

### Próximos pasos
- Push a `master` y redeploy en EasyPanel (pendiente desde QA 2026-04-01)
- Ejecutar `prisma migrate deploy` en producción (hay 1 migración pendiente: campo `shippingAddress`)
- Configurar variables `COMPANY_*` en EasyPanel

<!-- Agregar nuevas entradas arriba de esta línea, debajo del encabezado -->
