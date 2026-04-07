# MÓDULO: Producción

---

## Propósito
Gestionar las órdenes de producción a través de las 3 fases del proceso de ensamble de Maral.

## Entidades principales
- `ProductionOrder` — tarea de fabricación ligada a un pedido y un producto

## Las 3 fases de Maral
1. **BASICO** — preparación de componentes y materiales
2. **PREENSAMBLE** — integración de partes y subcomponentes
3. **ENSAMBLE_FINAL** — producto terminado listo para empaque

## Ciclo de vida de una orden de producción
```
PENDIENTE → EN_PROCESO → TERMINADO → EMPACADO
```

## Rutas del backend
```
GET    /api/production           — Lista con filtros por estado y fase
GET    /api/production/:id       — Detalle de la orden
POST   /api/production           — Crear orden de producción
PUT    /api/production/:id       — Editar orden
PATCH  /api/production/:id/status — Cambiar estado
```

## Páginas del frontend
- `Production.tsx` — Lista de órdenes activas con filtros por fase y estado

## Funcionalidades implementadas
- ✅ CRUD de órdenes de producción
- ✅ Asignación de responsable (`assignedTo`)
- ✅ Fecha requerida por orden
- ✅ Cambio de estado por fase

## Funcionalidades pendientes (Roadmap Fase 3)
- ❌ Vista de carga por fase: ¿cuántas OPs activas en cada fase?
- ❌ Métricas de tiempo promedio por fase
- ❌ Alerta de órdenes con `requiredDate` vencida
- ❌ Vista de Gantt o timeline de producción

## Nota de mismatch (P0)
El frontend actualmente usa fases incorrectas: CORTE, ENSAMBLE, SOLDADURA, PINTURA, PRUEBAS, EMPAQUE.
Debe corregirse a: BASICO, PREENSAMBLE, ENSAMBLE_FINAL.
Ver `docs/HANDOFFS/frontend-agent.md` para instrucciones.

## Conexión con otros módulos
- **Pedidos:** Un pedido confirmado genera órdenes de producción
- **Inventario:** La producción consume materias primas del inventario
- **Pedidos (empaque):** Al terminar producción, el pedido pasa a EMPACADO
