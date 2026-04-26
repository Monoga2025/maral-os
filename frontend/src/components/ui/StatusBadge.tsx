import { Badge } from './Badge'
import type {
  QuotationStatus,
  OrderStatus,
  ClientCategory,
  ProductionStatus,
  InvoiceStatus,
  FactoringStatus,
  PurchaseOrderStatus,
  ProductLine,
} from '../../types'

type BadgeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'red'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'indigo'
  | 'gray'

const quotationStatusMap: Record<
  QuotationStatus,
  { label: string; variant: BadgeVariant }
> = {
  BORRADOR: { label: 'Borrador', variant: 'gray' },
  ENVIADA: { label: 'Enviada', variant: 'blue' },
  APROBADA: { label: 'Aprobada', variant: 'green' },
  RECHAZADA: { label: 'Rechazada', variant: 'red' },
  CONVERTIDA: { label: 'Convertida', variant: 'indigo' },
}

const orderStatusMap: Record<
  OrderStatus,
  { label: string; variant: BadgeVariant }
> = {
  CONFIRMADO: { label: 'Confirmado', variant: 'blue' },
  EN_PRODUCCION: { label: 'En Producción', variant: 'orange' },
  LISTO: { label: 'Listo', variant: 'green' },
  EMPACADO: { label: 'Empacado', variant: 'purple' },
  DESPACHADO: { label: 'Despachado', variant: 'indigo' },
  ENTREGADO: { label: 'Entregado', variant: 'green' },
  CANCELADO: { label: 'Cancelado', variant: 'red' },
}

const clientCategoryMap: Record<string, { label: string; variant: BadgeVariant }> = {
  FUNDADOR_HISTORICO: { label: 'Fundador Histórico', variant: 'red' },
  FUNDADOR_MARAL: { label: 'Fundador Maral', variant: 'blue' },
  ALIADO: { label: 'Aliado', variant: 'green' },
  PROSPECTO: { label: 'Prospecto', variant: 'yellow' },
  IMPORTADOR: { label: 'Importador (IM)', variant: 'purple' },
  DISTRIBUIDOR: { label: 'Distribuidor (DS)', variant: 'indigo' },
  CLIENTE_FINAL: { label: 'Cliente Final (CF)', variant: 'orange' },
}

const productionStatusMap: Record<
  ProductionStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDIENTE: { label: 'Pendiente', variant: 'gray' },
  EN_PROCESO: { label: 'En Proceso', variant: 'blue' },
  TERMINADO: { label: 'Terminado', variant: 'green' },
  EMPACADO: { label: 'Empacado', variant: 'purple' },
}

const invoiceStatusMap: Record<
  InvoiceStatus,
  { label: string; variant: BadgeVariant }
> = {
  VIGENTE: { label: 'Vigente', variant: 'blue' },
  PAGADA: { label: 'Pagada', variant: 'green' },
  VENCIDA: { label: 'Vencida', variant: 'red' },
}

const factoringStatusMap: Record<
  FactoringStatus,
  { label: string; variant: BadgeVariant }
> = {
  APROBADO: { label: 'Aprobado', variant: 'green' },
  EN_ESTUDIO: { label: 'En Estudio', variant: 'yellow' },
  RECHAZADO: { label: 'Rechazado', variant: 'red' },
  NO_APLICA: { label: 'No Aplica', variant: 'gray' },
}

const purchaseStatusMap: Record<
  PurchaseOrderStatus,
  { label: string; variant: BadgeVariant }
> = {
  BORRADOR: { label: 'Borrador', variant: 'gray' },
  ENVIADA: { label: 'Enviada', variant: 'blue' },
  PARCIAL: { label: 'Parcial', variant: 'yellow' },
  RECIBIDA: { label: 'Recibida', variant: 'green' },
  CANCELADA: { label: 'Cancelada', variant: 'red' },
}

const productLineMap: Record<ProductLine, { label: string; variant: BadgeVariant }> = {
  ESTANDAR: { label: 'Estándar', variant: 'blue' },
  PREMIUM: { label: 'Premium', variant: 'purple' },
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const config = quotationStatusMap[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusMap[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function ClientCategoryBadge({ category }: { category: ClientCategory }) {
  const config = clientCategoryMap[category] ?? { label: category, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function ProductionStatusBadge({ status }: { status: ProductionStatus }) {
  const config = productionStatusMap[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = invoiceStatusMap[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function FactoringStatusBadge({ status }: { status: FactoringStatus }) {
  const config = factoringStatusMap[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function PurchaseStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const config = purchaseStatusMap[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function ProductLineBadge({ line }: { line: ProductLine }) {
  const config = productLineMap[line] ?? { label: line, variant: 'gray' as BadgeVariant }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
