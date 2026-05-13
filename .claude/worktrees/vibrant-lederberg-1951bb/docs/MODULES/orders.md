# MÓDULO: Pedidos

---

## Propósito
Gestionar pedidos confirmados desde su creación hasta la entrega al cliente.

## Entidades principales
- `Order` — el pedido con datos de despacho
- `OrderItem` — líneas de producto del pedido
- `OrderPhoto` — fotos de empaque/despacho

## Ciclo de vida
```
CONFIRMADO → EN_PRODUCCION → EMPACADO → DESPACHADO → ENTREGADO
           → CANCELADO (antes del despacho)
```

## Tipos de pedido
- `PEDIDO` — pedido comercial normal
- `GARANTIA` — reposición por garantía
- `MUESTRA` — muestra sin costo para cliente

## Rutas del backend
```
GET    /api/orders                      — Lista paginada con filtros
GET    /api/orders/:id                  — Detalle con ítems, fotos, producción
GET    /api/orders/check-duplicate      — Verificar pedido duplicado
POST   /api/orders                      — Crear pedido
PUT    /api/orders/:id                  — Editar pedido
DELETE /api/orders/:id                  — Cancelar pedido
PATCH  /api/orders/:id/status           — Cambiar estado
POST   /api/orders/:id/photos           — Subir fotos (jpg/png/webp, max 10MB)
GET    /api/orders/:id/dispatch-pdf     — Generar PDF de despacho
```

## Páginas del frontend
- `Orders.tsx` — Vista Kanban (por estado) o tabla
- `OrderDetail.tsx` — Detalle completo con fotos, producción, facturación
- `OrderForm.tsx` — Crear pedido (desde cotización o desde cero)

## Funcionalidades implementadas
- ✅ Kanban visual por estados
- ✅ Vista tabla alternativa
- ✅ Creación desde cotización (hereda ítems y precios)
- ✅ Subida de fotos de empaque/despacho
- ✅ Generación de PDF de despacho
- ✅ Datos de envío: destinatario, dirección, transportadora, guía, flete
- ✅ Verificación de duplicados
- ✅ Confirmación por gerencia (campo `confirmed`)

## Funcionalidades pendientes (Roadmap Fase 3)
- ❌ Checklist de verificación previa al despacho
- ❌ Confirmación de entrega por el cliente
- ❌ Notificación automática al cliente cuando se despacha
- ❌ Alerta de pedidos sin confirmar >3 días (está en Dashboard, no en la lista)

## Conexión con otros módulos
- **Cotizaciones:** Un pedido puede originarse de una cotización ACEPTADA
- **Producción:** Al confirmar un pedido, se crean órdenes de producción
- **Inventario:** Al despachar, se registran salidas de stock
- **Cartera:** Al despachar, se puede crear la factura
