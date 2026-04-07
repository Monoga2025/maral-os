/**
 * contracts.ts — Contratos de API de MARAL OS
 *
 * FUENTE DE VERDAD para nombres de campos en requests al backend.
 * Estos tipos DEBEN coincidir exactamente con los schemas Zod en backend/src/routes/.
 *
 * AGENTES IA: leer este archivo antes de modificar api.ts o cualquier formulario
 * que envíe datos al backend.
 *
 * Regla de oro:
 *   - Los tipos *Request   = lo que el frontend ENVÍA  (deben coincidir con Zod)
 *   - Los tipos en types/  = lo que el backend DEVUELVE (deben coincidir con Prisma)
 *   - Nunca usar Partial<TipoRespuesta> como tipo de request.
 */

import type { QuotationStatus, OrderStatus } from '../types'

// ─── Quotations ──────────────────────────────────────────────────────────────
// Fuente: backend/src/routes/quotations.ts → quotationSchema / quotationItemSchema

export interface QuotationItemRequest {
  productId: string
  qty: number                      // ← campo Prisma: QuotationItem.qty (NO 'quantity')
  unitPrice: number
  discount?: number                // default 0
  kitComponents?: {
    componentId: string
    qty: number                    // ← campo Prisma: QuotationItemComponent.qty
  }[]
}

export interface CreateQuotationRequest {
  clientId: string
  sellerId?: string
  status?: QuotationStatus
  validityDays?: number            // default 15
  paymentTerms?: string            // default 'Contado'
  notes?: string
  followUpDate?: string            // ISO datetime string
  shippingAddress?: string         // dirección de envío para la etiqueta del PDF
  taxPercent?: number              // 0-100 (porcentaje, NO decimal). default 0
  items: QuotationItemRequest[]
}

export type UpdateQuotationRequest = Partial<Omit<CreateQuotationRequest, 'clientId'>>

export interface ConvertToOrderRequest {
  recipientName: string
  address: string
  city: string
  phone: string
  carrier: string
  freightPayer: string
  freightPayment: string
  type?: 'PEDIDO' | 'GARANTIA' | 'MUESTRA'  // default 'PEDIDO'
  notes?: string
}

// ─── Orders ──────────────────────────────────────────────────────────────────
// Fuente: backend/src/routes/orders.ts → orderSchema / orderItemSchema

export interface OrderItemRequest {
  productId: string
  qty: number                      // ← campo Prisma: OrderItem.qty (NO 'quantity')
  unitPrice: number
}

export interface CreateOrderRequest {
  clientId: string
  quotationId?: string
  type?: 'PEDIDO' | 'GARANTIA' | 'MUESTRA'
  recipientName?: string
  address?: string
  city?: string
  phone?: string
  carrier?: string
  freightPayer?: string
  freightPayment?: string
  notes?: string
  items: OrderItemRequest[]
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus
  guideNumber?: string
  dispatchDate?: string
}

// ─── Production ──────────────────────────────────────────────────────────────
// Fuente: backend/src/routes/production.ts

export interface CreateProductionRequest {
  productId: string
  orderId?: string
  qty: number                      // ← campo Prisma: ProductionOrder.qty
  phase?: string
  assignedTo?: string
  requiredDate?: string
  notes?: string
}

// ─── Inventory ───────────────────────────────────────────────────────────────
// Fuente: backend/src/routes/inventory.ts

export interface InventoryMovementRequest {
  productId: string
  type: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION'
  qty: number                      // ← campo Prisma: InventoryMovement.qty
  reason: string                   // ← required by backend (min 1 char)
  referenceId?: string
  referenceType?: string
}

// ─── Purchases ───────────────────────────────────────────────────────────────
// Fuente: backend/src/routes/purchases.ts

export interface PurchaseItemRequest {
  productId: string
  qty: number                      // ← campo Prisma: PurchaseItem.qty
  unitCost: number
}

export interface CreatePurchaseRequest {
  supplierId: string
  notes?: string
  items: PurchaseItemRequest[]
}

// ─── Clients ─────────────────────────────────────────────────────────────────
// Fuente: backend/src/routes/clients.ts

export interface CreateClientRequest {
  name: string
  company?: string
  rut?: string
  email?: string
  phone?: string
  whatsapp?: string
  city?: string
  address?: string
  category: 'FUNDADOR_HISTORICO' | 'FUNDADOR_MARAL' | 'ALIADO' | 'PROSPECTO'
  creditLimit?: number
  paymentDays?: number
  notes?: string
}

export type UpdateClientRequest = Partial<CreateClientRequest>

// ─── Products ────────────────────────────────────────────────────────────────
// Fuente: backend/src/routes/products.ts

export interface CreateProductRequest {
  reference: string
  name: string
  line?: string
  category?: string
  priceList: number
  priceDistributor: number
  cost: number
  warrantyYears?: number
  stock?: number
  minStock?: number
  unit?: string
  location?: string
  specs?: Record<string, unknown>
  applications?: string[]
}

export type UpdateProductRequest = Partial<CreateProductRequest>

export interface UpdateProductComponentsRequest {
  components: {
    componentId: string
    qty: number                    // ← campo Prisma: ProductComponent.qty
    unit?: string
  }[]
}
