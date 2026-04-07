# MÓDULO: CRM / Gestión de Clientes

---

## Propósito
Centralizar toda la información de clientes y prospectos. Dar visibilidad del estado comercial de cada relación.

## Entidades principales
- `Client` — empresa/contacto con toda su info comercial
- `ActivityLog` — registro de interacciones (automático por ahora)

## Rutas del backend
```
GET    /api/clients              — Lista paginada con búsqueda y filtros
GET    /api/clients/:id          — Detalle + estadísticas
GET    /api/clients/:id/stats    — Total comprado, última compra, facturas pendientes
POST   /api/clients              — Crear cliente
PUT    /api/clients/:id          — Editar cliente
DELETE /api/clients/:id          — Desactivar (soft delete)
```

## Páginas del frontend
- `Clients.tsx` — Lista con búsqueda, filtro por categoría, acciones rápidas
- `ClientDetail.tsx` — Vista 360°: datos, cotizaciones, pedidos, facturas, stats
- `ClientForm.tsx` — Formulario de creación/edición

## Categorías de cliente
| Categoría | Descripción |
|-----------|-------------|
| FUNDADOR_HISTORICO | Desde los inicios (~2018), máxima prioridad |
| FUNDADOR_MARAL | Cliente fundador de la marca |
| ALIADO | Distribuidor/integrador activo con crédito |
| PROSPECTO | Lead sin primera compra |

## Funcionalidades implementadas
- ✅ CRUD completo
- ✅ Estadísticas por cliente (total comprado, órdenes activas, facturas vencidas)
- ✅ Filtro por categoría, ciudad, estado de factoring
- ✅ Soft delete (cliente queda inactivo, no se borra)

## Funcionalidades pendientes (ver Roadmap Fase 2)
- ❌ Clientes dormidos: filtro por "sin actividad en >90 días"
- ❌ Historial de interacciones manual (notas + fecha + tipo de contacto)
- ❌ Segmentación por volumen de compras
- ❌ Alerta de oportunidad de reactivación

## Impacto en el negocio
La reactivación de clientes históricos es una de las palancas más directas para aumentar ventas. Un cliente que compró antes tiene menor fricción que un prospecto nuevo.
