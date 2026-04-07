# MÓDULO: Cartera / Crédito

---

## Propósito
Controlar las facturas emitidas, gestionar el cobro y administrar el crédito disponible por cliente. Conectar con factoring FINANCIA para clientes aprobados.

## Entidades principales
- `Invoice` — factura emitida a un cliente por un pedido
- `Client` (campos `creditLimit`, `paymentDays`, `factoringStatus`) — crédito del cliente

## Ciclo de vida de una factura
```
VIGENTE → PAGADA    (se registra el pago)
        → VENCIDA   (automático cuando dueDate < hoy y no está pagada)
```

## Estados de factoring por cliente
- `APROBADO` — cliente puede usar financiamiento FINANCIA
- `EN_ESTUDIO` — solicitud en evaluación
- `RECHAZADO` — no aplica financiamiento
- `NO_APLICA` — cliente no solicitó

## Rutas del backend
```
GET    /api/invoices              — Lista con filtros por estado y cliente
GET    /api/invoices/:id          — Detalle de la factura
GET    /api/invoices/credit-summary — Resumen de cartera + crédito por cliente
POST   /api/invoices              — Crear factura
PUT    /api/invoices/:id/pay      — Registrar pago (total o parcial)
```

## Páginas del frontend
- `Credit.tsx` — Lista de facturas, resumen de cartera, gestión de pagos

## Funcionalidades implementadas
- ✅ CRUD de facturas
- ✅ Registro de pagos
- ✅ Resumen de crédito por cliente
- ✅ Integración con estado de factoring del cliente
- ✅ Facturas vencidas en Dashboard (KPI)

## Nota de mismatch (P0)
El frontend usa `InvoiceStatus = PENDIENTE | PAGADA | VENCIDA | ANULADA`.
El backend usa `VIGENTE | VENCIDA | PAGADA`.
Corregir en `frontend/src/types/index.ts`. Ver `docs/HANDOFFS/frontend-agent.md`.

## Funcionalidades pendientes (Roadmap Fase 4)
- ❌ Vista de antigüedad de cartera (0-30d, 31-60d, 61-90d, >90d)
- ❌ Registro de gestiones de cobro (llamadas, acuerdos, pagos parciales)
- ❌ Alerta de facturas próximas a vencer (N días antes)
- ❌ Resumen ejecutivo: total cartera, cartera vencida, por cobrar

## Indicadores clave
- **Cartera total:** suma de facturas VIGENTES + VENCIDAS
- **Cartera vencida:** suma de facturas VENCIDAS
- **DSO (Days Sales Outstanding):** días promedio de cobro
- **Clientes con cartera vencida:** número de clientes con facturas vencidas

## Impacto en el negocio
La cartera vencida es dinero que ya se trabajó y no se cobró. Cada factura vencida sin gestión es liquidez perdida. El control activo de cartera es tan importante como generar nuevas ventas.
