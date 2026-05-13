# DOMAIN_MODEL.md — Modelo de dominio de MARAL OS

> Última actualización: 2026-03-31

---

## 1. Entidades principales

### Client (Cliente)
El centro del CRM. Representa una empresa o persona que compra a Maral.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| name | string | Nombre del contacto |
| company | string | Empresa |
| rut | string | NIT/RUT |
| city, department | string | Ubicación |
| phone, whatsapp | string | Contacto |
| email | string | Correo |
| category | enum | FUNDADOR_HISTORICO, FUNDADOR_MARAL, ALIADO, PROSPECTO |
| creditLimit | decimal | Límite de crédito aprobado |
| paymentDays | int | Días de plazo de pago |
| factoringStatus | enum | APROBADO, EN_ESTUDIO, RECHAZADO, NO_APLICA |
| allowWhiteLabel | bool | Permite marca blanca |
| howFound | string | Cómo llegó el cliente |
| notes | text | Notas internas |
| active | bool | Soft delete |

### Product (Producto)
Artículo del catálogo. Puede ser producto terminado, insumo o materia prima.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| reference | string | Código SKU (único) |
| name | string | Nombre |
| category | enum | ESTACION_BASE, MOVIL, HANDY, CABLE, CONECTOR, BASE, ACCESORIO, MATERIA_PRIMA |
| line | enum | ESTANDAR, PREMIUM |
| priceList | decimal | Precio de lista (cliente final) |
| priceDistributor | decimal | Precio distribuidor |
| cost | decimal | Costo interno |
| stock | int | Unidades en bodega |
| minStock | int | Stock mínimo de alerta |
| location | string | Ubicación en bodega |
| specs | json | Especificaciones técnicas |
| active | bool | Soft delete |

### Quotation (Cotización)
Oferta comercial enviada al cliente. Puede convertirse en pedido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| number | string | Número correlativo (ej: COT-2024-001) |
| clientId | uuid | → Client |
| sellerId | uuid | → User (vendedor) |
| status | enum | BORRADOR, ENVIADA, VISTA, ACEPTADA, RECHAZADA, EXPIRADA |
| validityDays | int | Días de validez |
| paymentTerms | string | Condiciones de pago |
| subtotal, tax, total | decimal | Totales |
| items | QuotationItem[] | Líneas de la cotización |

### Order (Pedido)
Pedido confirmado por el cliente. Pasa por producción y despacho.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| number | string | Número correlativo (ej: PED-2024-001) |
| quotationId | uuid | → Quotation (nullable, si viene de cotización) |
| clientId | uuid | → Client |
| status | enum | CONFIRMADO, EN_PRODUCCION, EMPACADO, DESPACHADO, ENTREGADO, CANCELADO |
| type | enum | PEDIDO, GARANTIA, MUESTRA |
| confirmed | bool | ¿Confirmado por gerencia? |
| recipientName | string | Destinatario del despacho |
| address, city | string | Dirección de entrega |
| carrier | string | Transportadora |
| freightPayer | string | Quién paga el flete |
| guideNumber | string | Número de guía de envío |
| dispatchDate | date | Fecha de despacho |

### ProductionOrder (Orden de producción)
Tarea de fabricación asociada a un pedido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| number | string | Correlativo |
| orderId | uuid | → Order |
| productId | uuid | → Product |
| qty | int | Cantidad a producir |
| phase | enum | BASICO, PREENSAMBLE, ENSAMBLE_FINAL |
| status | enum | PENDIENTE, EN_PROCESO, TERMINADO, EMPACADO |
| assignedTo | string | Responsable |
| requiredDate | date | Fecha requerida |

### Invoice (Factura)
Documento de cobro asociado a un pedido entregado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| number | string | Número de factura |
| orderId | uuid | → Order |
| clientId | uuid | → Client |
| amount | decimal | Monto total |
| dueDate | date | Fecha de vencimiento |
| paidAt | date | Fecha de pago (null si pendiente) |
| status | enum | VIGENTE, VENCIDA, PAGADA |

### InventoryMovement (Movimiento de inventario)
Registro de cada cambio en stock de un producto.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| productId | uuid | → Product |
| type | enum | ENTRADA, SALIDA, AJUSTE, DEVOLUCION |
| qty | int | Cantidad (positivo o negativo) |
| reason | string | Motivo |
| referenceId | string | ID del documento de origen |
| referenceType | string | Tipo: ORDER, PURCHASE, MANUAL |

### Supplier (Proveedor)
Empresa que vende insumos o componentes a Maral.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| name | string | Nombre |
| contact | string | Persona de contacto |
| phone | string | Teléfono |
| city | string | Ciudad |
| paymentTerms | string | Condiciones de pago |
| active | bool | Soft delete |

### PurchaseOrder (Orden de compra)
Solicitud de compra a un proveedor.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| number | string | Correlativo |
| supplierId | uuid | → Supplier |
| status | enum | BORRADOR, ENVIADA, RECIBIDA, CANCELADA |
| total | decimal | Total |
| receivedAt | date | Fecha de recepción |

---

## 2. Relaciones entre entidades

```
Client ──────────────────────────────────────────────────┐
  │                                                       │
  ├── Quotation (1:N)                                     │
  │     └── QuotationItem (1:N) ──→ Product               │
  │            │                                          │
  │            ▼ (convert)                                │
  ├── Order (1:N) ◄───────────────────────────────────────┘
  │     ├── OrderItem (1:N) ──→ Product
  │     ├── OrderPhoto (1:N)
  │     ├── ProductionOrder (1:N) ──→ Product
  │     └── Invoice (1:N)
  │
  └── Invoice (1:N)

Product ──────────────────────────────────────────────────
  ├── QuotationItem (1:N)
  ├── OrderItem (1:N)
  ├── ProductionOrder (1:N)
  ├── InventoryMovement (1:N)
  └── PurchaseItem (1:N)

Supplier ─────────────────────────────────────────────────
  └── PurchaseOrder (1:N)
        └── PurchaseItem (1:N) ──→ Product

User ─────────────────────────────────────────────────────
  ├── Quotation (vendedor)
  └── ActivityLog (1:N)
```

---

## 3. Ciclo de vida de los documentos

### Cotización
```
BORRADOR → ENVIADA → VISTA → ACEPTADA → (Pedido creado)
                           → RECHAZADA
           → EXPIRADA (por tiempo)
```

### Pedido
```
CONFIRMADO → EN_PRODUCCION → EMPACADO → DESPACHADO → ENTREGADO
           → CANCELADO (en cualquier punto anterior a despacho)
```

### Orden de producción
```
PENDIENTE → EN_PROCESO → TERMINADO → EMPACADO
```

### Factura
```
VIGENTE → PAGADA
        → VENCIDA (automático por fecha)
```

### Orden de compra
```
BORRADOR → ENVIADA → RECIBIDA
         → CANCELADA
```

---

## 4. Eventos de negocio importantes

Estos eventos deben quedar registrados en ActivityLog y serán los puntos de integración para automatización futura:

| Evento | Trigger | Impacto |
|--------|---------|---------|
| `quotation.sent` | Cotización pasa a ENVIADA | Iniciar seguimiento comercial |
| `quotation.accepted` | Cotización ACEPTADA | Crear pedido |
| `quotation.expired` | Sin respuesta después de validityDays | Alerta para vendedor |
| `order.confirmed` | Pedido confirmado por gerencia | Crear órdenes de producción |
| `order.dispatched` | Pedido DESPACHADO | Crear factura |
| `invoice.overdue` | Factura no pagada después de dueDate | Alerta de cartera |
| `stock.critical` | stock < minStock | Alerta para crear OC |
| `production.complete` | Fase ENSAMBLE_FINAL terminada | Notificar para empaque |

---

## 5. Categorías de clientes (CRM)

| Categoría | Descripción | Tratamiento |
|-----------|-------------|-------------|
| FUNDADOR_HISTORICO | Clientes desde los inicios (~2018) | Máxima prioridad, condiciones especiales |
| FUNDADOR_MARAL | Clientes fundadores de la marca | Alta prioridad |
| ALIADO | Distribuidores/integradores activos | Crédito disponible |
| PROSPECTO | Lead sin primera compra | En proceso de conversión |
