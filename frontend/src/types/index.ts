export type UserRole = 'GERENTE' | 'VENTAS' | 'LOGISTICA' | 'CONTADORA'

export type TaskPriority = 'URGENTE' | 'NORMAL' | 'DESPUES'
export type TaskStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA'
export type ExpenseType = 'CAJA_MENOR' | 'TARJETA'

export type ClientCategory = string

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
  | 'DESPACHO_PARCIAL'
  | 'DESPACHADO'
  | 'ENTREGADO'
  | 'CANCELADO'

export type ShipmentStatus = 'PREPARANDO' | 'DESPACHADO' | 'ENTREGADO' | 'CANCELADO'

export interface ShipmentItem {
  id: string
  shipmentId: string
  orderItemId: string
  quantity: number
  orderItem?: OrderItem & { product?: { id: string; name: string; reference: string } }
}

export interface Shipment {
  id: string
  number: number
  orderId: string
  status: ShipmentStatus
  carrier?: string
  trackingNumber?: string
  notes?: string
  creditDispatch: boolean
  dispatchedAt?: string
  createdAt: string
  updatedAt: string
  items: ShipmentItem[]
  invoice?: { id: string; number: number; amount: number; status: string; dueDate: string }
}

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
  cedula?: string
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
  department?: string
  category: ClientCategory
  segment?: string | null
  creditLimit: number
  creditUsed: number
  paymentDays: number
  factoringStatus: FactoringStatus
  purchaseFrequency?: PurchaseFrequency
  isProvider?: boolean
  active: boolean
  notes?: string
  previousNames?: string[]
  merlinCode?: string
  interestTags?: string[]
  optedOut?: boolean
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
  qty: number
  unitPrice: number
  quantityShipped: number
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
  dianInvoiceNumber?: string
  dispatchDate?: string
  photos?: OrderPhoto[]
  notes?: string
  total: number
  items: OrderItem[]
  productionOrders?: ProductionOrder[]
  shipments?: Shipment[]
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
  assignedUser?: Pick<User, 'id' | 'name'>
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

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  body: string
  createdAt: string
  user?: Pick<User, 'id' | 'name'>
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
  createdBy?: Pick<User, 'id' | 'name' | 'role' | 'phone' | 'whatsapp'>
  assignedTo?: Pick<User, 'id' | 'name' | 'role' | 'phone' | 'whatsapp'>
  client?: Pick<Client, 'id' | 'name' | 'company'>
  order?: Pick<Order, 'id' | 'number'>
  comments?: TaskComment[]
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

// WhatsApp Assist
export interface WaChat {
  id: string
  jid: string
  number: string
  name: string
  type: 'contacto' | 'grupo'
  unread: number
  lastMessage: string
  lastTimestamp: string
  fromMeLast: boolean
  unanswered: boolean
  profilePic?: string
  clientId?: string
  clientName?: string
  clientCategory?: string
  temperature?: string
}

export interface WaMessage {
  id: string
  remoteId?: string
  fromMe: boolean
  sender?: string
  type: string
  text: string
  mediaUrl?: string
  mimeType?: string
  fileName?: string
  timestamp: string
  aiSuggestion?: string
}

// Campaigns (Sales Machine Sprint 1)
export type CampaignStatus = 'BORRADOR' | 'VALIDANDO' | 'LISTA' | 'EN_CURSO' | 'PAUSADA' | 'COMPLETADA' | 'CANCELADA'

// ── Marco IA ──────────────────────────────────────────────────

export interface MarcoStep {
  order: number
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
  content: string
  imagePrompt?: string
  imageTemplate?: string
  imageAspect?: string
  delaySeconds: number
  principlesUsed: string[]
  note?: string
}

export interface MarcoResult {
  strategy: {
    templateBase: string
    framework: string
    objective: string
    audienceInsight: string
    psychologyUsed: string[]
    expectedReadRate: string
    expectedResponseRate: string
    expectedConversion: string
  }
  steps: MarcoStep[]
  validation: {
    score: number
    checks: { principle: string; pass: boolean; note: string }[]
    antiPatternsFound: string[]
    improvements: string[]
  }
  productPhotosUsed: boolean
  marcoNote: string
}
export type StepType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
export type RecipientStatus = 'PENDING' | 'SCHEDULED' | 'SENT' | 'DELIVERED' | 'READ' | 'REPLIED' | 'CONVERTED' | 'FAILED' | 'EXCLUDED'

export interface ABVariant {
  id: string
  content: string
  weight?: number
}

export interface CampaignStep {
  id: string
  campaignId: string
  order: number
  type: StepType
  content?: string
  mediaUrl?: string
  mimeType?: string
  fileName?: string
  delaySeconds: number
  renderedContent?: string
  variants?: ABVariant[] | null
  variantMetric?: Record<string, { sent: number; replied: number; converted: number }> | null
}

export interface CampaignMetric {
  id: string
  campaignId: string
  sent: number
  delivered: number
  read: number
  replied: number
  converted: number
  revenueCOP: number
  updatedAt: string
}

export interface CampaignRecipient {
  id: string
  campaignId: string
  clientId: string
  status: RecipientStatus
  currentStep: number
  scheduledAt?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  repliedAt?: string
  client?: Pick<Client, 'id' | 'name'> & { whatsapp?: string }
}

export interface Campaign {
  id: string
  name: string
  objective?: string
  status: CampaignStatus
  createdById: string
  audienceFilter?: Record<string, unknown>
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  createdBy?: Pick<User, 'id' | 'name'>
  steps?: CampaignStep[]
  metrics?: CampaignMetric
  recipients?: CampaignRecipient[]
  _count?: { recipients: number }
}

export interface AudienceFilter {
  segments?: string[]
  categories?: string[]
  tagIds?: string[]
  cities?: string[]
  interestTags?: string[]
  hasOrderedInLastMonths?: number | null
  hasNotOrderedInLastMonths?: number | null
  minLifetimeValue?: number
  excludeActiveQuotations?: boolean
  excludeActiveOrders?: boolean
  excludeOptedOut?: boolean
  excludeRecentCampaign?: number
}

// Sprint 4: Conversión y seguimiento
export type LeadTemperature = 'HOT' | 'WARM' | 'COLD' | 'OPTOUT' | 'OFFTOPIC'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  meta: Record<string, unknown> | null
  createdAt: string
}

export interface CampaignLead {
  id: string
  campaignId: string
  clientId: string
  status: string
  temperature: LeadTemperature | null
  repliedAt?: string
  convertedAt?: string
  quotationId?: string
  client: {
    id: string
    name: string
    company?: string
    whatsapp?: string
    phone?: string
    city?: string
  }
  campaign: {
    id: string
    name: string
    objective?: string
  }
}

// Sprint 3: Nano Banana
export type ImageTemplate = 'promo' | 'comparativa' | 'lanzamiento' | 'testimonial' | 'educativo'
export type AspectRatio = '1:1' | '4:5' | '16:9'

export interface BrandGuardResult {
  approved: boolean
  issues: string[]
  professionalScore: number
}

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  template?: string
  aspectRatio: string
  approvedByBrand: boolean
  brandScore?: number
  brandIssues?: string[]
  usedInCampaigns: string[]
  createdAt: string
}

export interface ReactivationRadarClient {
  id: string
  name: string
  company?: string
  phone?: string
  whatsapp?: string
  waNumber?: string
  city?: string
  category?: string
  totalSpent: number
  orderCount: number
  daysInactive: number
  lastOrderDate: string | null
  lastProducts: string[]
  primaryProduct: string
  urgency: 'CRITICO' | 'DORMIDO' | 'ENFRIANDOSE' | 'SEGUIMIENTO' | 'ACTIVO'
  suggestedPitch: string
}

export interface ReactivationRadarData {
  summary: {
    totalOpportunities: number
    criticalCount: number
    dormantCount: number
    coolingCount: number
    followUpCount: number
    potentialRevenueCOP: number
  }
  clients: ReactivationRadarClient[]
}

export interface CompetitorComparisonItem {
  id: string
  category: 'ANTENAS_BASE' | 'ANTENAS_MOVILES' | 'DIPOLOS' | 'CABLES' | 'CONECTORES' | 'FUENTES'
  maralName: string
  maralRef: string
  maralPriceCOP: number
  syscomRef: string
  syscomPriceUSD: number
  syscomPriceCOP: number
  syscomAvailability: 'STOCK_LIMITADO' | 'SIN_STOCK' | 'IMPORTACION_15D' | 'DISPONIBLE'
  maralStock: number
  maralAdvantageDays: number
  priceDiffCOP: number
  savingsPercentage: number
  isMaralCheaper: boolean
  killerPitch: string
}

export interface CompetitorComparisonData {
  summary: {
    totalProductsTracked: number
    averageSavingsPercentage: number
    totalPriceAdvantageCOP: number
    syscomOutOrSlowCount: number
    lastScrapedAt: string
    trmApplied: number
  }
  items: CompetitorComparisonItem[]
}

export interface B2BProspect {
  id: string
  name: string
  companyName: string
  nit: string
  sector: 'SEGURIDAD_PRIVADA' | 'TRANSPORTE_CARGA' | 'INSTALADOR_TELECOM' | 'MINERIA_INDUSTRIA' | 'AGROINDUSTRIA'
  city: string
  department: string
  estimatedRadiosCount: number
  contactName: string
  contactRole: string
  phone: string
  whatsapp: string
  email: string
  currentSupplier: string
  monthlyPotentialCOP: number
  primaryNeed: string
  suggestedAction: string
  customPitch: string
  isConverted: boolean
}

export interface B2BProspectingData {
  summary: {
    totalLeads: number
    totalPipelineValueCOP: number
    securityLeadsCount: number
    transportLeadsCount: number
    installerLeadsCount: number
    industryLeadsCount: number
  }
  leads: B2BProspect[]
}
