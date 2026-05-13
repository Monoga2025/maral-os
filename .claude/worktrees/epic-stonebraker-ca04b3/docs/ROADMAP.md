# ROADMAP.md — Fases y prioridades de MARAL OS

> Última actualización: 2026-04-01
> Principio rector: **primero impacto de negocio, después complejidad técnica**

---

## Contexto de priorización

La empresa tiene caída de ventas. Las prioridades son las que generan impacto directo en:
1. Velocidad de cierre de ventas (cotizaciones con kits configurables)
2. Trazabilidad operativa (quién hizo qué, cuándo)
3. Visibilidad de producción y entregas
4. Comunicación interna sin perder WhatsApp
5. Control de cartera y cobro

---

## Fase 1 — Estabilización y correcciones críticas ✅ En progreso
**Objetivo:** El sistema funciona sin bugs silenciosos y refleja la realidad del negocio.

### 1.1 Correcciones P0 (bloqueantes)
- [ ] Corregir mismatch de enums entre frontend y backend
  - `ProductLine`: ESTANDAR/PREMIUM (alinear frontend)
  - `ProductionPhase`: BASICO/PREENSAMBLE/ENSAMBLE_FINAL (alinear frontend)
  - `InvoiceStatus`: VIGENTE/VENCIDA/PAGADA (alinear frontend)
  - `UserRole`: eliminar ADMIN del frontend si no existe en backend
- [ ] Asegurar JWT_SECRET siempre desde variable de entorno
- [ ] Estandarizar parámetro de paginación: elegir `limit` o `pageSize`

### 1.2 Funcionalidad faltante de alto impacto
- [ ] CRUD de usuarios desde la UI (crear, editar, desactivar)
- [ ] Backend de la página de Configuración
- [ ] Restricción de vistas por rol en el frontend (VENTAS no ve Producción, etc.)

### 1.3 Observabilidad mínima
- [x] Logging de requests (implementado en index.ts)
- [ ] Códigos de error consistentes en respuestas de API

---

## Fase 2 — Kits, auditoría y comunicación interna ✅ Implementado

**Objetivo:** Resolver el problema de kits configurables, trazabilidad y comunicación.

### 2.1 Kits dinámicos con receta editable ✅
- [x] Modelo `ProductComponent` (BOM) en schema
- [x] Modelo `QuotationItemComponent` (overrides por cotización)
- [x] Campo `isKit` en Product
- [x] Endpoints GET/PUT `/api/products/:id/components`
- [x] ProductForm: toggle isKit + editor de componentes BOM
- [x] QuotationForm: modal editor de kit al agregar un kit a cotización
- [x] Soporte de `kitComponents` en POST/PUT cotizaciones
- [ ] Descuento automático de componentes de inventario al confirmar pedido

### 2.2 Auditoría de cambios ✅
- [x] Campo `updatedById` en Order y ProductionOrder
- [x] Relación a User para saber quién avanzó cada estado
- [ ] Frontend: mostrar "Actualizado por X" en detalle de pedido/producción
- [ ] Endpoint PATCH `/orders/:id/status` que grabe `updatedById`

### 2.3 Tareas internas ✅
- [x] Modelo `Task` con prioridad (URGENTE/NORMAL/DESPUES) y estados
- [x] Rutas CRUD completas `/api/tasks`
- [x] Vinculación a cliente y pedido
- [x] Auditoría en ActivityLog
- [ ] Página de Tareas en el frontend (`/tareas`)
- [ ] Notificaciones en dashboard al recibir tarea

### 2.4 Gastos y caja menor ✅
- [x] Modelo `Expense` (CAJA_MENOR / TARJETA)
- [x] Rutas CRUD + aprobación `/api/expenses`
- [x] Permisos por rol (LOGISTICA solo ve sus gastos)
- [ ] Página de Gastos en el frontend (`/gastos`)
- [ ] Upload de foto de soporte desde celular

---

## Fase 3 — Pedidos y producción mejorados

**Objetivo:** Trazabilidad completa de pedidos y producción.

### 3.1 Pedidos (Módulo 2)
- [ ] Mostrar productos del pedido individualmente con estado (en stock / requiere fabricación)
- [ ] Botón "Ya está listo" / "Enviar a producción" por producto
- [ ] Enlazar pedido con sus órdenes de producción en la UI
- [ ] Campo número de guía del envío (ya existe en schema)
- [ ] Fotos de evidencia de empaque (ya existe OrderPhoto, mejorar UI)
- [ ] Vista responsive para celular en empaque

### 3.2 Producción (Módulo 3)
- [ ] Heredar fecha requerida desde fecha de despacho del pedido (con margen configurable: 3 días antes)
- [ ] Crear órdenes de producción automáticamente desde pedidos (productos sin stock)
- [ ] Mostrar a qué pedido y cliente pertenece cada OP
- [ ] Frontend: mostrar "Actualizado por X" con timestamp

### 3.3 Remite / Despacho (Módulo 11)
- [ ] Generar remite destino automáticamente desde datos del cliente del pedido
- [ ] Foto del remite pegado al paquete antes de despachar
- [ ] Notificación WhatsApp al cliente al despachar con número de guía

---

## Fase 4 — Cotización → Facturación (Módulo 1)

**Objetivo:** Flujo sin rediligenciar, con notas crédito.

- [ ] Botón "Facturar" en cotización/pedido → prefactura sin rediligenciar
- [ ] Flujo: Cotización → Prefactura → Factura confirmada
- [ ] Anulación de factura (nota crédito) + crear nueva
- [ ] Anulación parcial por producto
- [ ] Rediseño PDF de cotización
- [ ] Sincronización con sistema contable externo sin duplicar registros

---

## Fase 5 — Inventario avanzado (Módulo 4)

**Objetivo:** Inventario proactivo con reposición automática.

- [ ] Separar inventario de producto terminado vs. insumos de producción
- [ ] Descuento automático de insumos al registrar producción (usando BOM)
- [ ] Lista de proveedores priorizada por producto (proveedor 1, 2, 3)
- [ ] Envío automático de WhatsApp al proveedor 1 al llegar al stock mínimo
- [ ] Escalado automático a proveedor 2/3 si no puede surtir (lógica IA)
- [ ] Los empleados pueden registrar movimientos negativos (pérdidas) pero no editar existentes

---

## Fase 6 — Cartera y crédito (Módulo 6)

**Objetivo:** Cero facturas vencidas sin gestión activa.

- [ ] Reglas automáticas de crédito (pagos puntuales → sube cupo; mora → baja)
- [ ] Alerta anticipada de vencimiento (configurable, ej: 7 días antes)
- [ ] Botón "Registrar pago" directo desde vista de cartera
- [ ] Score de cliente basado en historial de pagos
- [ ] Vista de cartera vencida con antigüedad (0-30, 31-60, 61-90, >90 días)

---

## Fase 7 — Analítica y CRM (Módulo 10)

**Objetivo:** Datos reales para reactivar ventas.

- [ ] Analítica de ventas por producto: ranking, comparativo de períodos
- [ ] Clientes dormidos: hace cuánto no compran, qué compraban
- [ ] Dashboard con meta mensual y margen promedio
- [ ] Registro de seguimiento por cliente: historial de conversaciones, próxima acción
- [ ] Alerta automática de clientes sin actividad >90 días

---

## Fase 8 — App móvil y recordatorios (Módulos 9)

**Objetivo:** Acceso desde celular para empleados y gerente.

- [ ] Botón flotante de recordatorio rápido (texto o audio)
- [ ] Recordatorios visibles en dashboard como tareas pendientes
- [ ] Vista responsive de producción y empaque (fotos desde celular)

---

## Fase 9 — Infraestructura y calidad

**Objetivo:** Sistema robusto y mantenible.

- [ ] Rate limiting en API
- [ ] Migrar almacenamiento de archivos a cloud (S3 o similar)
- [ ] Tests de integración para flujos críticos (cotización→pedido, stock)
- [ ] Documentación OpenAPI/Swagger
- [ ] Backup automático de base de datos
- [ ] CI/CD pipeline básico

---

## Fase 10 — Automatización e IA (Módulos 4, 10 — capa externa)

> Esta fase NO empieza hasta que Fases 1–7 estén estables.
> La IA es siempre una capa externa — el ERP funciona sin ella.

- [ ] Sistema de eventos/webhooks (publicar eventos de negocio a endpoints externos)
- [ ] Agente de seguimiento comercial (cotizaciones sin respuesta → sugiere acción)
- [ ] Agente de cartera (vencimientos → genera borrador de comunicación)
- [ ] Agente de reposición (stock crítico → selecciona proveedor con IA, genera borrador OC)
- [ ] Integración WhatsApp API para notificaciones automáticas
- [ ] Escalado de proveedor 1 → 2 → 3 con IA si el principal no puede surtir

---

## Prioridad inmediata de implementación (orden sugerido por el equipo)

| # | Módulo | Estado | Impacto |
|---|--------|--------|---------|
| 1 | Kits dinámicos con receta editable | ✅ Backend + Frontend | Alto — cotizaciones |
| 2 | Auditoría de cambios en pedidos/producción | ✅ Schema listo | Alto — trazabilidad |
| 3 | Tareas internas | ✅ Backend listo | Alto — comunicación |
| 4 | Fotos de evidencia en empaque | ⚠️ Parcial (schema ok) | Medio |
| 5 | Módulo de gastos / caja menor | ✅ Backend listo | Medio |
| 6 | Analítica de ventas y CRM | Pendiente | Alto — reactivación |
| 7 | Auto-compra insumos por WhatsApp + IA | Pendiente | Fase 10 |

---

## Métricas de éxito

| Métrica | Estado actual (est.) | Meta |
|---------|---------------------|------|
| Tiempo promedio cotización → envío | Desconocido | < 2 horas |
| Tasa de conversión cotización → pedido | Desconocido | > 40% |
| Facturas vencidas sin gestión | Desconocido | 0 |
| Clientes sin actividad >90 días contactados/mes | 0 | > 5 |
| Órdenes de producción con retraso | Desconocido | < 10% |
| Referencias de kits infladas en catálogo | Desconocido | 0 nuevas |
