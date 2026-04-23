export type UserRole = 'GERENTE' | 'VENTAS' | 'LOGISTICA'

export type TaskPriority = 'URGENTE' | 'NORMAL' | 'DESPUES'
export type TaskStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA'
export type ExpenseType = 'CAJA_MENOR' | 'TARJETA'

export type ClientCategory =
  | 'FUNDADOR_HISTORICO'
  | 'FUNDADOR_MARAL'
  | 'ALIADO'
  | 'PROSPECTO'
  | 'IMPORTADOR'
  | 'DISTRIBUIDOR'
  | 'CLIENTE_FINAL'

export type FactoringStatus = 'APROBADO' | 'EN_ESTUDIO' | 'RECHAZADO' | 'NO_APLICA'

export type PurchaseFrequency = 'FRECUENTE' | 'INTERMITENTE' | 'ESPORADICA' | 'NINGUNA'

export type QuotationStatus =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CONVERTIDA'

export type OrderStatus =
  | 'CONFIRMADO'
  | 'EN_PRODUCCION'
  | 'LISTO'
  | 'EMPACADO'
  | 'DESPACHADO'
  | 'ENTREGADO'
  | 'CANCELADO'

export type ProductLine = 'ESTANDAR' | 'PREMIUM'

export type ProductCategory =
  | 'ESTACION_BASE'
  | 'MOVIL'
  | 'HANDY'
  | 'CABLE'
  | 'CONECTOR'
  | 'BASE'
  | 'ACCESORIO'
  | 'MATERIA_PRIMA'

export type ProductionStatus =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'TERMINADO'
  | 'EMPACADO'

export type ProductionPhase =
  | 'BASICO'
  | 'PREENSAMBLE'
  | 'ENSAMBLE_FINAL'

export type InvoiceStatus = 'VIGENTE' | 'VENCIDA' | 'PAGADA'

export type PurchaseOrderStatus =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'PARCIAL'
  | 'RECIBIDA'
  | 'CANCELADA'

export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active?: boolean
  avatar?: string
  whatsapp?: string
  phone?: string
  title?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  company?: string
  rut?: string
  email?: string
  phone?: string
  whatsapp?: string
  city?: string
  address?: string
  category: ClientCategory
  creditLimit: number
  creditUsed: number
  paymentDays: number
  factoringStatus: FactoringStatus
  purchaseFrequency?: PurchaseFrequency
  isProvider?: boolean
  active: boolean
  notes?: string
  merlinCode?: string
  createdAt: string
  updatedAt: string
  lastOrderAt?: string
  lastOrders?: string[]
  totalPurchases?: number
  ordersCount?: number
  /** @deprecated alias for active */
  isActive?: boolean
}

export interface ProductComponent {
  id: string
  kitId: string
  componentId: string
  component?: Pick<Product, 'id' | 'reference' | 'name' | 'unit' | 'stock'>
  qty: number
  unit: string
}

export interface Product {
  id: string
  reference: string
  name: string
  description?: string
  line?: ProductLine
  category?: ProductCategory
  priceList: number
  priceDistributor: number
  /** @deprecated use priceList */
  price?: number
  cost: number
  stock: number
  minStock: number
  unit: string
  isActive?: boolean
  isKit?: boolean
  kitComponents?: ProductComponent[]
  createdAt: string
  updatedAt: string
}

export interface QuotationItemComponent {
  id: string
  quotationItemId: string
  componentId: string
  component?: Pick<Product, 'id' | 'reference' | 'name' | 'unit'>
  qty: number
}

export interface QuotationItem {
  id: string
  quotationId: string
  productId: string
  product?: Product
  qty: number                      // campo Prisma: QuotationItem.qty
  unitPrice: number
  discount: number
  subtotal: number
  kitComponents?: QuotationItemComponent[]
}

export interface Quotation {
  id: string
  number: string
  clientId: string
  client?: Client
  sellerId: string
  seller?: User
  status: QuotationStatus
  validityDays: number
  paymentTerms?: string
  followUpDate?: string
  notes?: string
  shippingAddress?: string
  subtotal: number
  tax: number
  total: number
  validUntil?: string
  items: QuotationItem[]
  createdAt: string
  updatedAt: string
}

export interface OrderPhoto {
  id: string
  orderId: string
  url: string
  phase?: string
  uploadedAt: string
}

export type ItemDisposition = 'PENDIENTE' | 'STOCK' | 'PRODUCCION'

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  product?: Product
  qty: number                      // campo Prisma: OrderItem.qty
  unitPrice: number
  picked: boolean
  disposition: ItemDisposition
}

export interface Order {
  id: string
  number: string
  clientId: string
  client?: Client
  quotationId?: string
  quotation?: Quotation
  type?: string
  status: OrderStatus
  confirmed: boolean
  recipientName?: string
  address?: string
  city?: string
  phone?: string
  carrier?: string
  freightPayer?: string
  freightPayment?: string
  guideNumber?: string
  dispatchDate?: string
  photos?: OrderPhoto[]
  notes?: string
  total: number
  items: OrderItem[]
  productionOrders?: ProductionOrder[]
  updatedBy?: Pick<User, 'id' | 'name'>
  createdAt: string
  updatedAt: string
}

export interface ProductionOrder {
  id: string
  number: string
  productId: string
  product?: Product
  orderId?: string
  order?: Order
  qty: number
  quantity?: number
  phase: ProductionPhase
  status: ProductionStatus
  assignedTo?: string
  requiredDate?: string
  completedAt?: string
  notes?: string
  materials?: ProductionMaterial[]
  photos?: string[]
  createdAt: string
  updatedAt: string
}

export interface ProductionMaterial {
  id: string
  productionOrderId: string
  productId: string
  product?: Product
  requiredQty: number
  availableQty: number
  isAvailable: boolean
}

export interface Invoice {
  id: string
  number: number
  orderId?: string
  order?: Pick<Order, 'id' | 'number'>
  clientId: string
  client?: Pick<Client, 'id' | 'name' | 'company'>
  status: InvoiceStatus
  dueDate: string
  amount: number
  paidAt?: string
  createdAt: string
  /** Computed by backend, not stored */
  daysOverdue?: number
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  phone?: string
  city?: string
  paymentTerms?: string
  notes?: string
  active: boolean
  createdAt: string
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  product?: Product
  qty: number                      // campo Prisma: PurchaseItem.qty
  unitCost: number
  received: boolean
}

export interface PurchaseOrder {
  id: string
  number: string
  supplierId: string
  supplier?: Supplier
  status: PurchaseOrderStatus
  expectedDate?: string
  receivedAt?: string
  notes?: string
  total: number
  items: PurchaseOrderItem[]
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  productId: string
  product?: Product
  type: MovementType
  qty: number                      // campo Prisma: InventoryMovement.qty
  reason?: string
  referenceId?: string
  referenceType?: string
  createdAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  user?: User
  action: string
  entity: string
  entityId: string
  description: string
  createdAt: string
}

export interface DashboardData {
  salesThisMonth: number
  salesGoal: number
  activeOrders: number
  ordersByStatus: Record<OrderStatus, number>
  pendingQuotations: number
  overdueFollowUps: number
  overdueReceivables: number
  salesLast6Months: { month: string; amount: number }[]
  salesByLine: { line: string; amount: number }[]
  criticalStock: number
  unconfirmedOrders: number
  quotationsWithoutFollowup: number
  recentActivity: ActivityLog[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApiError {
  message: string
  statusCode: number
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  createdById: string
  assignedToId: string
  clientId?: string
  orderId?: string
  dueDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  createdBy?: Pick<User, 'id' | 'name'>
  assignedTo?: Pick<User, 'id' | 'name'>
  client?: Pick<Client, 'id' | 'name' | 'company'>
  order?: Pick<Order, 'id' | 'number'>
}

export interface Expense {
  id: string
  date: string
  concept: string
  amount: number
  type: ExpenseType
  receiptUrl?: string
  notes?: string
  createdById: string
  approvedById?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  createdBy?: Pick<User, 'id' | 'name'>
  approvedBy?: Pick<User, 'id' | 'name'>
}
