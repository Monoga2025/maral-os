# PROJECT MASTER — MARAL OS

> Fuente de verdad sobre visión, contexto de negocio y estado actual del proyecto.
> Última actualización: 2026-04-06

---

## 1. Visión

MARAL OS es el **sistema nervioso** de Maral Tecnología y Comunicaciones S.A.S.

Su objetivo es darle a la empresa visibilidad total de su operación: desde que llega un prospecto hasta que se cobra la última cuota de una factura. Un sistema que elimine el caos operativo, acelere el ciclo de ventas y permita tomar decisiones con datos reales.

**Meta de largo plazo:** plataforma empresarial modular, extensible, con base sólida para incorporar automatización e IA sin depender de ella para funcionar.

---

## 2. Contexto de negocio

### La empresa
- **Nombre:** Maral Tecnología y Comunicaciones S.A.S.
- **Tipo:** Empresa familiar colombiana
- **Sector:** Manufactura y comercialización B2B de equipos electrónicos y soluciones de telecomunicaciones
- **Mercado:** Integradores, distribuidores y empresas industriales (Bogotá, Medellín, otras ciudades)

### Proceso productivo (3 fases)
1. **Básico** — preparación de componentes y materiales
2. **Preensamble** — integración de partes y subcomponentes
3. **Ensamble final** — producto terminado listo para entrega

### Ciclo operativo completo
```
Prospección → Cotización → Pedido → Producción → Despacho/Facturación → Cartera/Cobro
```

### Problema actual (marzo 2026)
- Caída importante en volumen de ventas
- Menor liquidez familiar directa
- Necesidad urgente de:
  - Reactivar clientes históricos
  - Acelerar velocidad de cotización
  - Mejorar seguimiento de oportunidades comerciales
  - Tener visibilidad clara de producción y despachos
  - Controlar activamente la cartera vencida

---

## 3. Usuarios del sistema

| Rol | Persona | Responsabilidades |
|-----|---------|------------------|
| GERENTE | John Mónoga | Visión global, decisiones, reportes ejecutivos |
| VENTAS | Lady García | CRM, cotizaciones, seguimiento comercial |
| LOGISTICA | Angelo Pérez | Pedidos, producción, inventario, despachos |

---

## 4. Módulos actuales y estado

> Estado al 2026-04-05 (post-ciclo QA completo del 2026-04-01)

| Módulo | Estado | Notas |
|--------|--------|-------|
| Dashboard + KPIs | ✅ Funcional | 8+ KPIs, sales-chart optimizado (Promise.all) |
| CRM / Clientes | ✅ Funcional | CRUD completo + estadísticas por cliente |
| Catálogo de productos | ✅ Funcional | CRUD + BOM/kits + control de stock |
| Cotizaciones | ✅ Funcional | Ciclo completo + kits + conversión a pedido (transaccional) |
| Pedidos | ✅ Funcional | Kanban + tabla + fotos + PDF de despacho (pdfkit) |
| Producción | ✅ Funcional | 3 fases + estados + N+1 corregido |
| Inventario | ✅ Funcional | Movimientos + alertas de stock mínimo |
| Compras / Proveedores | ✅ Funcional | OC + recepción parcial/total |
| Cartera / Crédito | ✅ Funcional | Facturas + pagos + daysOverdue correcto |
| Tareas | ✅ Backend | API completa; sin página frontend dedicada |
| Gastos | ✅ Backend | API completa; sin página frontend dedicada |
| Usuarios | ✅ Backend | CRUD completo (solo GERENTE); sin UI en Settings |
| Reportes | ⚠️ Parcial | Básico; faltan filtros y exportación CSV/Excel |
| Configuración | ⚠️ Parcial | UI funcional para Sync; falta CRUD usuarios y gastos |
| Manual / Ayuda | ⚠️ Incompleto | UI sin contenido real |
| Módulo Sync | ⚠️ Esqueleto | Estado en memoria; no persistente |

---

## 5. Problemas técnicos conocidos

> Los P0 del diagnóstico inicial fueron corregidos en el ciclo QA del 2026-04-01.
> Reporte completo: `docs/REPORTS/QA-REPORT-2026-04-01.md`

### Corregidos (era P0)
- ✅ Mismatch de enums entre frontend y backend — corregido
- ✅ JWT Secret hardcodeado — eliminado el fallback; falla explícito si falta variable
- ✅ `convertToOrder` retornaba 404 (URL incorrecta) — corregido
- ✅ BOM de kits se perdía al convertir cotización a pedido — corregido

### P1 — Pendientes
- `convert-to-order` no valida si el cliente está activo antes de crear pedido
- `uploadPhoto` no valida tipo MIME ni tamaño en el servidor

### P2 — Deuda técnica (13 items)
- `QuotationItem.product` sin `onDelete` explícito en schema
- `Order.client` sin `onDelete: Restrict`
- `QuotationItem` sin `@@index([quotationId])`
- Sin tests unitarios ni de integración
- Sin documentación OpenAPI/Swagger
- Almacenamiento de archivos local (sin cloud storage)
- Sin rate limiting en la API
- CORS wildcard en desarrollo (aceptable para dev)

### Gaps funcionales pendientes
- Sin páginas frontend para Tareas (`/tareas`) y Gastos (`/gastos`)
- Sin UI para CRUD de usuarios en Configuración
- Reportes sin exportación CSV/Excel ni filtros avanzados

---

## 6. Decisiones arquitectónicas tomadas

Ver `docs/DECISIONS/` para ADRs completos.

- ADR-001: Arquitectura monolito modular con separación frontend/backend
- ADR-002: Capa de IA desacoplada del core operativo

---

## 7. Próximas prioridades (Fase 1)

Ver `docs/ROADMAP.md` para detalle completo.

**Inmediato (impacto de negocio):**
1. ✅ ~~Corregir mismatches de enums~~ — hecho
2. Crear páginas frontend para Tareas y Gastos
3. Agregar CRUD de usuarios en Settings.tsx
4. Mejorar reportes (exportación CSV/Excel)
5. Mejorar seguimiento comercial (pipeline de cotizaciones)

---

## 8. Gaps identificados en reunión operativa 2026-04-06

> Requerimientos expresados por el gerente de Maral en reunión directa.
> Documentados tal como fueron planteados, sin filtro técnico.
> **No implementar sin revisar primero el ROADMAP** — muchos ya tienen fase asignada.
>
> Estado: ✅ Implementado · ⚠️ Parcial · 🔲 Pendiente

---

### GAP-01 — PEDIDOS: despacho directo vs. producción por ítem
**Estado:** 🔲 Pendiente — Roadmap: Fase 3.1

Desde un pedido confirmado, poder marcar **producto por producto** si está en stock (despachar directo) o si requiere fabricación. No todos los productos de un pedido pasan por producción.

- El schema ya tiene `OrderItem` con `qty` y `unitPrice` — falta el campo de estado por ítem (en stock / enviado a producción)
- Requiere: nuevo campo `OrderItem.disposition` (STOCK | PRODUCCION) + UI en `OrderDetail.tsx` con botones por fila
- Impacto alto: evita crear órdenes de producción innecesarias y agiliza despachos parciales

---

### GAP-02 — PEDIDOS: auditoría de quién avanzó el estado
**Estado:** ⚠️ Parcial — Roadmap: Fase 2.2

Mostrar en el detalle del pedido quién fue el último usuario que cambió el estado (nombre + fecha + hora).

- El schema ya tiene `Order.updatedById` (implementado en QA de abril)
- El backend de `PATCH /orders/:id/status` **no graba `updatedById` aún** — está pendiente
- Falta: conectar en `OrderDetail.tsx` → mostrar "Actualizado por Angelo · hace 2 horas"

---

### GAP-03 — PRODUCCIÓN: sugerencia automática al convertir cotización a pedido
**Estado:** 🔲 Pendiente — Roadmap: Fase 3.2

Al convertir una cotización a pedido, el sistema debe **sugerir automáticamente** qué ítems van a producción (no están en stock) y cuáles se despachan directo (hay stock suficiente).

- Lógica: comparar `qty` de cada `QuotationItem` contra `Product.stock` al momento de convertir
- Si `stock >= qty` → sugerir "En stock, despacho directo"
- Si `stock < qty` → sugerir "Requiere fabricación: X unidades"
- Esta lógica alimenta directamente GAP-01
- Requiere coordinación con el módulo de inventario (transacción atómica al confirmar)

---

### GAP-04 — CATÁLOGO / KITS: receta editable al cotizar
**Estado:** ✅ Implementado — Roadmap: Fase 2.1

Los kits tienen una receta (BOM) con cantidades predeterminadas. Al cotizar se pueden modificar (ej: cable de 5 m → 7 m). El **cliente ve solo el nombre del kit y el precio total** — el equipo interno ve los componentes.

- Ya implementado: `ProductComponent` (BOM), `QuotationItemComponent` (overrides), modal `KitEditor` en `QuotationForm.tsx`
- Pendiente relacionado: descontar componentes individuales del inventario al vender (GAP-05)

---

### GAP-05 — INVENTARIO: descuento automático de componentes al vender un kit
**Estado:** 🔲 Pendiente — Roadmap: Fase 2.1 (pendiente) / Fase 5

Al confirmar la venta de un kit, el sistema debe **descontar inventario componente por componente** usando las cantidades del BOM (o del override de la cotización si se modificaron).

- Momento del descuento: al cambiar el pedido a estado `LISTO` o `DESPACHADO`
- Usar `QuotationItemComponent` si existe (override); sino usar `ProductComponent` estándar
- Crear movimientos de inventario tipo `SALIDA` automáticos por cada componente
- Riesgo: si el pedido no viene de una cotización, no hay `QuotationItemComponent` — usar BOM base

---

### GAP-06 — TAREAS: módulo de notas y recordatorios rápidos
**Estado:** ⚠️ Parcial — Roadmap: Fase 2.3 / Fase 8

Módulo de notas/recordatorios rápidos accesible desde celular. Prioridades: URGENTE, NORMAL, DESPUÉS. Con asignación entre usuarios del equipo.

- Backend completo: `Task` con `TaskPriority`, `TaskStatus`, CRUD en `/api/tasks`
- Pendiente: página `/tareas` en el frontend
- Acceso desde celular: el sistema ya es responsive — la página solo necesita diseño mobile-first con botón flotante de "Nueva tarea rápida"
- Usuarios mencionados: John (gerente), Lady (ventas), Angelo (logística) — asignación ya está en el modelo

---

### GAP-07 — REMITE / DESPACHO: foto de confirmación al empacar
**Estado:** ⚠️ Parcial — Roadmap: Fase 3.3

El PDF de remite-destino ya existe (implementado 2026-04-06). Falta: **foto de confirmación** tomada desde el celular al momento de pegar la etiqueta y empacar el pedido.

- El schema ya tiene `OrderPhoto` — actualmente se usa para fotos generales del pedido
- Requiere: flujo específico "foto de empaque" diferenciado por `phase = 'EMPAQUE'`
- UI: botón "Tomar foto de empaque" en `OrderDetail.tsx`, carga desde cámara del celular
- La foto queda asociada al pedido y al momento de despacho como evidencia

---

### GAP-08 — REPORTES: analítica de productos
**Estado:** 🔲 Pendiente — Roadmap: Fase 7

Saber qué productos se venden más, en qué mes, y tendencias por cliente.

- Queries necesarias: ranking de productos por `OrderItem.qty * unitPrice` agrupado por período, comparativo de períodos, top clientes por producto
- Estas queries existen en datos ya capturados en `OrderItem` — solo falta exponerlas en `/api/reports`
- Contexto de negocio: la empresa tiene caída de ventas — saber qué productos se están dejando de vender tiene impacto directo en reactivación comercial

---

### GAP-09 — CARTERA: reglas automáticas de crédito
**Estado:** 🔲 Pendiente — Roadmap: Fase 6

Pagos puntuales suben el cupo de crédito del cliente. Retrasos bajan el cupo o bloquean automáticamente al cliente a solo contado.

- Requiere: campo `Client.creditScore` o similar + motor de reglas configurables por el GERENTE
- Reglas sugeridas por el gerente:
  - 3 pagos puntuales consecutivos → incrementar cupo un porcentaje
  - 1 pago con retraso > 15 días → reducir cupo
  - 2 pagos con retraso → bloquear a contado hasta ponerse al día
- El campo `Client.paymentDays` y `Invoice.daysOverdue` ya existen — la lógica se construye sobre ellos
- Alerta: este módulo afecta la relación comercial con clientes — implementar con aprobación del gerente antes de activar reglas automáticas

---

### GAP-10 — GASTOS: caja menor con soporte fotográfico
**Estado:** ⚠️ Parcial — Roadmap: Fase 2.4

Iván (¿Angelo?) registra gastos de caja menor desde su teléfono con foto del recibo. Lady cuadra semanalmente.

- Backend completo: `Expense` (CAJA_MENOR / TARJETA), CRUD en `/api/expenses`
- Pendiente: página `/gastos` en el frontend
- Pendiente: upload de foto de soporte (el campo `referenceUrl` ya existe en el schema)
- Flujo operativo: empleado registra gasto + sube foto → GERENTE aprueba → Lady revisa el cuadre semanal filtrando por fecha
- Aclarar con el equipo: ¿"Iván" es un empleado nuevo o es Angelo?

---

### GAP-11 — FACTURACIÓN: botón "Facturar en Merlin" con AutoHotkey
**Estado:** 🔲 Pendiente — Roadmap: Fase 4 + AutoHotkey (pendiente)

Botón en el pedido/cotización que abra Merlin con los datos del cliente y del pedido prellenados, para que el contador genere la factura electrónica DIAN sin rediligenciar.

- Merlin es una aplicación de escritorio (Microsoft Access). La automatización requiere **AutoHotkey** para:
  1. Detectar si Merlin está abierto, si no abrirlo
  2. Navegar al módulo de facturación
  3. Enviar keystrokes con `merlinCode` del cliente para buscarlo
  4. Llenar los campos del documento con los datos del pedido
- Prerequisito: que `merlinCode` esté poblado en los clientes (pendiente `sync_maral.py`)
- CRÍTICO: MARAL OS no escribe en la DB de Merlin — AutoHotkey solo simula acciones de teclado/ratón del usuario. No viola la arquitectura de solo lectura.
- Complejidad: media-alta. Merlin puede cambiar de versión y romper los selectores

---

### GAP-12 — COMPRAS: proveedores alternativos por producto
**Estado:** 🔲 Pendiente — Roadmap: Fase 5

Si el proveedor 1 no tiene stock de un insumo, poder contactar automáticamente al proveedor 2 (y al 3 si es necesario).

- Requiere: tabla de proveedores por producto con prioridad (`ProductSupplier` con `priority: 1 | 2 | 3`, `leadTimeDays`, `unitCost`)
- El modelo actual solo tiene `Supplier` sin vinculación directa a productos
- Fase inicial (manual): mostrar la lista de proveedores alternativos en la pantalla de compras al crear una OC
- Fase futura (Fase 10): IA/webhook que contacte automáticamente al proveedor 2 si el 1 no confirma en X horas

---

### Matriz de prioridad (visión del gerente)

| # | Gap | Urgencia | Impacto | Complejidad | Fase ROADMAP |
|---|-----|----------|---------|-------------|--------------|
| GAP-06 | Tareas / recordatorios | 🔴 Alta | Alto | Baja (backend listo) | 2.3 |
| GAP-10 | Gastos caja menor | 🔴 Alta | Medio | Baja (backend listo) | 2.4 |
| GAP-01 | Pedidos: ítem por ítem | 🟠 Media | Alto | Media | 3.1 |
| GAP-02 | Auditoría quién avanzó | 🟠 Media | Medio | Baja | 2.2 |
| GAP-03 | Sugerencia stock/producción | 🟠 Media | Alto | Media | 3.2 |
| GAP-05 | Descuento automático kits | 🟠 Media | Alto | Media | 2.1/5 |
| GAP-07 | Foto empaque despacho | 🟡 Normal | Medio | Baja | 3.3 |
| GAP-08 | Analítica de productos | 🟡 Normal | Alto | Media | 7 |
| GAP-09 | Reglas crédito automáticas | 🟡 Normal | Alto | Alta | 6 |
| GAP-11 | Facturar en Merlin (AutoHotkey) | 🟡 Normal | Alto | Alta | 4 |
| GAP-12 | Proveedores alternativos | 🟡 Normal | Medio | Media | 5 |
| GAP-04 | Kits BOM editable | ✅ | — | — | 2.1 |

---

## 9. Historial de sesiones

Ver `docs/AGENT_LOG.md` para bitácora cronológica.
