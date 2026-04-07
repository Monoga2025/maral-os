# MÓDULO: Cotizaciones

---

## Propósito
Gestionar el pipeline de ofertas comerciales desde borrador hasta conversión a pedido. Es el módulo más crítico para ventas.

## Entidades principales
- `Quotation` — la oferta comercial
- `QuotationItem` — líneas de producto en la cotización

## Ciclo de vida
```
BORRADOR → ENVIADA → VISTA → ACEPTADA → (se crea Pedido)
                           → RECHAZADA
           → EXPIRADA (automático por validityDays)
```

## Rutas del backend
```
GET    /api/quotations                — Lista con filtros por estado y vendedor
GET    /api/quotations/:id            — Detalle completo con items
POST   /api/quotations                — Crear cotización
PUT    /api/quotations/:id            — Editar cotización
DELETE /api/quotations/:id            — Eliminar cotización
POST   /api/quotations/:id/convert    — Convertir en pedido
POST   /api/quotations/:id/duplicate  — Duplicar cotización
PATCH  /api/quotations/:id/status     — Cambiar estado manualmente
```

## Páginas del frontend
- `Quotations.tsx` — Lista con tabs por estado + acciones
- `QuotationForm.tsx` — Crear/editar con líneas de producto

## Funcionalidades implementadas
- ✅ CRUD completo con ítems (producto, cantidad, precio, descuento)
- ✅ Cálculo automático de subtotal, IVA, total
- ✅ Conversión a pedido con un clic
- ✅ Duplicar cotización (para reutilizar)
- ✅ Cambio de estado manual
- ✅ Filtro por estado y vendedor

## Funcionalidades pendientes (Roadmap Fase 2)
- ❌ Indicador de tiempo en estado (días en ENVIADA sin respuesta)
- ❌ Alerta visual de cotizaciones sin seguimiento (>3 días en ENVIADA)
- ❌ Alerta de cotizaciones por expirar
- ❌ Notas/seguimiento por cotización
- ❌ Exportación a PDF mejorada
- ❌ Plantillas de cotización por tipo de cliente

## Indicadores clave
- **Tasa de conversión:** % de cotizaciones ACEPTADAS / total ENVIADAS
- **Tiempo medio de cierre:** días entre ENVIADA y ACEPTADA
- **Cotizaciones activas:** en ENVIADA o VISTA sin respuesta

## Impacto en el negocio
La velocidad de cotización y el seguimiento activo son los dos factores que más afectan la conversión. Una cotización que no se sigue muere en ENVIADA.
