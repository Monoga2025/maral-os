# MÓDULO: Inventario

---

## Propósito
Controlar el stock de productos terminados, componentes y materias primas. Disparar alertas cuando el stock cae por debajo del mínimo.

## Entidades principales
- `Product` (campo `stock`, `minStock`) — el stock vive en el producto
- `InventoryMovement` — registro de cada cambio de stock

## Tipos de movimiento
- `ENTRADA` — compra de materiales, devolución de cliente
- `SALIDA` — despacho de pedido, uso en producción
- `AJUSTE` — corrección manual de inventario
- `DEVOLUCION` — devolución de mercancía al proveedor

## Rutas del backend
```
GET    /api/inventory              — Lista de productos con estado de stock
POST   /api/inventory/movement     — Registrar movimiento de inventario
GET    /api/inventory/movements    — Historial de movimientos
GET    /api/products/low-stock     — Productos con stock <= minStock
```

## Estado de stock por producto
```
stock = 0           → SIN_STOCK  (crítico, no se puede despachar)
stock <= minStock   → CRITICO    (alerta, hay que reponer)
stock > minStock    → OK
```

## Páginas del frontend
- `Inventory.tsx` — Lista de productos con estado de stock, filtros, registro de movimiento

## Funcionalidades implementadas
- ✅ Lista con estado de stock por producto
- ✅ Registro manual de movimientos
- ✅ Historial de movimientos
- ✅ Alertas de stock crítico en Dashboard

## Funcionalidades pendientes (Roadmap Fase 3)
- ❌ Historial con filtros por producto, fecha, tipo de movimiento
- ❌ Alerta automática: producto crítico sin OC abierta → sugerir crear OC
- ❌ Valorización del inventario (stock × costo)
- ❌ Ajuste masivo de inventario (conteo físico)

## Conexión con otros módulos
- **Pedidos:** Al despachar un pedido, se registra movimiento SALIDA automáticamente
- **Compras:** Al recibir una OC, se registra movimiento ENTRADA automáticamente
- **Dashboard:** KPI de productos en stock crítico
