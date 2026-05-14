import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Circle, Upload, Printer, Package,
  MapPin, AlertTriangle, Check, Save, Copy, X, FileText,
  Factory, Plus, ChevronRight, Calendar, Truck, CreditCard,
} from 'lucide-react'
import { ordersApi, productionApi, productsApi, usersApi } from '../lib/api'
import { formatCOP, formatDate, getStatusColor } from '../lib/utils'
import type { Order, OrderStatus, ItemDisposition, ProductionStatus, Shipment, ShipmentStatus } from '../types'
import { toast } from 'sonner'

const PHASES = [
  { key: 'BASICO', label: 'Procesos Básicos' },
  { key: 'PREENSAMBLE', label: 'Preensamble' },
  { key: 'ENSAMBLE_FINAL', label: 'Ensamble Final' },
]

const PROD_STATUS_COLORS: Record<ProductionStatus, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  EN_PROCESO: 'bg-blue-100 text-blue-700',
  TERMINADO: 'bg-purple-100 text-purple-700',
  EMPACADO: 'bg-green-100 text-green-700',
}
const PROD_STATUS_LABELS: Record<ProductionStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En Proceso',
  TERMINADO: 'Terminado',
  EMPACADO: 'Empacado',
}

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'CONFIRMADO',    label: 'Confirmado' },
  { status: 'EN_PRODUCCION', label: 'En Producción' },
  { status: 'LISTO',         label: 'Listo' },
  { status: 'EMPACADO',      label: 'Empacado' },
  { status: 'DESPACHADO',    label: 'Despachado' },
  { status: 'ENTREGADO',     label: 'Entregado' },
]

const ORDER_INDEX: Record<string, number> = {
  CONFIRMADO: 0, EN_PRODUCCION: 1, LISTO: 2, EMPACADO: 3, DESPACHO_PARCIAL: 4, DESPACHADO: 4, ENTREGADO: 5,
}

const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, string> = {
  PREPARANDO: 'bg-yellow-100 text-yellow-700',
  DESPACHADO: 'bg-blue-100 text-blue-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
}
const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PREPARANDO: 'Preparando',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
    >
      <Copy size={11} />
      {copied ? 'Copiado' : (label ?? 'Copiar')}
    </button>
  )
}

function MerlinModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const items = order.items ?? []
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const iva = Math.round(subtotal * 0.19)
  const total = subtotal + iva

  const conceptoText = `Pedido #${order.number} - ${order.client?.name ?? ''}`

  const tableText = [
    ['Ref. Merlin', 'Descripción', 'Cantidad', 'Precio Unit.', 'Total'].join('\t'),
    ...items.map(i => [
      i.product?.reference ?? '',
      i.product?.name ?? '',
      i.qty,
      i.unitPrice,
      i.qty * i.unitPrice,
    ].join('\t')),
    '',
    `\t\t\tSubtotal\t${subtotal}`,
    `\t\t\tIVA 19%\t${iva}`,
    `\t\t\tTOTAL\t${total}`,
  ].join('\n')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-blue-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Facturar en Merlin</h2>
              <p className="text-xs text-gray-400">Pedido #{order.number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Sección 1 — Cliente */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. Cliente</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Código Merlin</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">
                    {order.client?.merlinCode ?? <span className="text-red-400 text-base font-normal">Sin código Merlin</span>}
                  </p>
                </div>
                {order.client?.merlinCode && (
                  <CopyButton text={order.client.merlinCode} label="Copiar código" />
                )}
              </div>
              <div className="border-t border-gray-200 pt-2">
                <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
                <p className="text-sm font-medium text-gray-800">{order.client?.name ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Sección 2 — Concepto */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. Concepto</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-800 break-all">{conceptoText}</p>
                <CopyButton text={conceptoText} />
              </div>
            </div>
          </div>

          {/* Sección 3 — Productos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">3. Productos</p>
              <CopyButton text={tableText} label="Copiar tabla" />
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Ref. Merlin</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Descripción</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Cant.</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Precio Unit.</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.product?.reference ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-800">{item.product?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-medium">{item.qty}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCOP(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCOP(item.qty * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sección 4 — Totales */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">4. Totales</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA 19%</span>
                <span className="font-medium">{formatCOP(iva)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">{formatCOP(total)}</span>
              </div>
            </div>
          </div>

          {/* Nota */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
            <span>Abre Merlin &rarr; Ventas &rarr; Nueva Factura &rarr; pega los datos</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const remiteRef = useRef<HTMLInputElement>(null)
  const [guideNumberDraft, setGuideNumberDraft] = useState('')
  const [dispatchDateDraft, setDispatchDateDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [showMerlinModal, setShowMerlinModal] = useState(false)
  const [showCreateOP, setShowCreateOP] = useState(false)
  const [opProductId, setOpProductId] = useState('')
  const [opQty, setOpQty] = useState(1)
  const [opPhase, setOpPhase] = useState('BASICO')
  const [opAssignee, setOpAssignee] = useState('')
  const [opRequired, setOpRequired] = useState('')

  // Shipment state
  const [showCreateShipment, setShowCreateShipment] = useState(false)
  const [shipmentItems, setShipmentItems] = useState<{ orderItemId: string; quantity: number }[]>([])
  const [shipmentCarrier, setShipmentCarrier] = useState('')
  const [shipmentTracking, setShipmentTracking] = useState('')
  const [shipmentNotes, setShipmentNotes] = useState('')
  const [shipmentCredit, setShipmentCredit] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
  })

  const order = data?.data

  const { data: shipmentsData, refetch: refetchShipments } = useQuery({
    queryKey: ['shipments', id],
    queryFn: () => ordersApi.getShipments(id!),
    enabled: !!id,
  })
  const shipments: Shipment[] = shipmentsData?.data ?? []

  useEffect(() => {
    if (order?.guideNumber) setGuideNumberDraft(order.guideNumber)
  }, [order?.guideNumber])

  const updateStatus = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(id!, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', id] }); toast.success('Estado actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })

  const dispatchCredit = useMutation({
    mutationFn: () => ordersApi.updateStatus(id!, 'DESPACHADO', { creditDispatch: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', id] }); toast.success('Pedido despachado a crédito y registrado en cartera') },
    onError: () => toast.error('Error al despachar a crédito'),
  })

  const uploadPhoto = useMutation({
    mutationFn: ({ file, phase }: { file: File; phase: string }) => {
      const fd = new FormData()
      fd.append('photo', file)
      fd.append('phase', phase)
      return ordersApi.uploadPhoto(id!, fd)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', id] }); toast.success('Foto subida') },
    onError: () => toast.error('Error al subir foto'),
  })

  const updateOrder = useMutation({
    mutationFn: (data: Record<string, unknown>) => ordersApi.update(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', id] }); toast.success('Pedido actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })

  const updateDisposition = useMutation({
    mutationFn: ({ itemId, disposition }: { itemId: string; disposition: ItemDisposition }) =>
      ordersApi.updateItemDisposition(id!, itemId, disposition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
    onError: () => toast.error('Error al actualizar disposición'),
  })

  const markPicked = useMutation({
    mutationFn: ({ itemId, picked }: { itemId: string; picked: boolean }) =>
      ordersApi.pickItem(id!, itemId, picked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
    onError: () => toast.error('Error al actualizar'),
  })

  const createOP = useMutation({
    mutationFn: () => productionApi.create({
      orderId: order?.id,
      productId: opProductId,
      qty: opQty,
      phase: opPhase as never,
      assignedTo: opAssignee,
      requiredDate: opRequired ? new Date(opRequired).toISOString() : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['production'] })
      toast.success('Orden de producción creada')
      setShowCreateOP(false)
      setOpProductId('')
      setOpQty(1)
    },
    onError: () => toast.error('Error al crear orden de producción'),
  })

  const createShipmentMutation = useMutation({
    mutationFn: () => ordersApi.createShipment(id!, {
      carrier: shipmentCarrier || undefined,
      trackingNumber: shipmentTracking || undefined,
      notes: shipmentNotes || undefined,
      creditDispatch: shipmentCredit,
      items: shipmentItems,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      refetchShipments()
      toast.success('Despacho registrado')
      setShowCreateShipment(false)
      setShipmentItems([])
      setShipmentCarrier('')
      setShipmentTracking('')
      setShipmentNotes('')
      setShipmentCredit(false)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error al registrar despacho')
    },
  })

  const updateShipmentMutation = useMutation({
    mutationFn: ({ shipmentId, status }: { shipmentId: string; status: string }) =>
      ordersApi.updateShipment(id!, shipmentId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      refetchShipments()
      toast.success('Despacho actualizado')
    },
    onError: () => toast.error('Error al actualizar despacho'),
  })

  const deleteShipmentMutation = useMutation({
    mutationFn: (shipmentId: string) => ordersApi.deleteShipment(id!, shipmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      refetchShipments()
      toast.success('Despacho eliminado')
    },
    onError: () => toast.error('Error al eliminar despacho'),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.getAll({ pageSize: 200 }),
    enabled: showCreateOP,
  })

  const { data: usersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.assignable().then((r) => r.data),
    enabled: showCreateOP,
  })

  const assignees = (usersData ?? []).filter((u) => u.role === 'LOGISTICA' || u.role === 'GERENTE')

  const DISPOSITION_LABELS: Record<ItemDisposition, string> = {
    PENDIENTE: 'Pendiente',
    STOCK: 'Stock',
    PRODUCCION: 'Producción',
  }
  const DISPOSITION_COLORS: Record<ItemDisposition, string> = {
    PENDIENTE: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    STOCK: 'bg-green-100 text-green-700 hover:bg-green-200',
    PRODUCCION: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  }
  const DISPOSITION_ACTIVE: Record<ItemDisposition, string> = {
    PENDIENTE: 'bg-gray-300 text-gray-800 font-semibold',
    STOCK: 'bg-green-500 text-white font-semibold',
    PRODUCCION: 'bg-orange-500 text-white font-semibold',
  }

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!order) return <div className="p-6 text-gray-500">Pedido no encontrado</div>

  const currentIndex = ORDER_INDEX[order.status] ?? 0

  const printDispatch = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Despacho #${order.number}</title>
      <style>body{font-family:Arial;padding:20px;font-size:12px}h1{color:#1e3a5f;font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.box{background:#f5f5f5;padding:10px;border-radius:4px}</style>
      </head><body>
      <h1>MARAL TECNOLOGÍA — Guía de Despacho #${order.number}</h1>
      <div class="meta">
        <div class="box"><b>Cliente:</b> ${order.client?.name ?? ''}<br/><b>Empresa:</b> ${order.client?.company ?? ''}</div>
        <div class="box"><b>Destinatario:</b> ${order.recipientName ?? order.client?.name ?? ''}<br/><b>Dirección:</b> ${order.address ?? ''}, ${order.city ?? ''}<br/><b>Teléfono:</b> ${order.phone ?? order.client?.phone ?? ''}</div>
        <div class="box"><b>Transportadora:</b> ${order.carrier ?? ''}<br/><b>Flete:</b> ${order.freightPayer ?? ''}</div>
        <div class="box"><b>Forma de pago flete:</b> ${order.freightPayment ?? ''}<br/><b>Guía:</b> ${order.guideNumber ?? '_______________'}</div>
      </div>
      <table><thead><tr><th>Ref</th><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr></thead>
      <tbody>${(order.items ?? []).map(i => `<tr><td>${i.product?.reference ?? ''}</td><td>${i.product?.name ?? ''}</td><td>${i.qty}</td><td>$${i.unitPrice?.toLocaleString('es-CO')}</td><td>$${(i.qty * i.unitPrice)?.toLocaleString('es-CO')}</td></tr>`).join('')}</tbody>
      </table>
      <p style="margin-top:16px"><b>Total: ${formatCOP(order.total)}</b></p>
      ${order.notes ? `<p><b>Observaciones:</b> ${order.notes}</p>` : ''}
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {showMerlinModal && (
        <MerlinModal order={order} onClose={() => setShowMerlinModal(false)} />
      )}

      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pedidos')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.number}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Creado el {formatDate(order.createdAt)}
            {order.updatedBy && (
              <span className="ml-3 text-gray-400">
                · Avanzado por <span className="font-medium text-gray-600">{order.updatedBy.name}</span> el {formatDate(order.updatedAt)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMerlinModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            <FileText size={14} />
            Facturar en Merlin
          </button>
          {order.status !== 'DESPACHADO' && order.status !== 'ENTREGADO' && (
            <button
              onClick={() => dispatchCredit.mutate()}
              disabled={dispatchCredit.isPending}
              className="flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 text-sm font-medium transition-colors disabled:opacity-50"
              title="Despachar sin consignación y crear cuenta por cobrar"
            >
              Cliente a crédito
            </button>
          )}
          <button
            onClick={printDispatch}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Printer size={16} />
            PDF Despacho
          </button>
        </div>
      </div>

      {/* Duplicate warning */}
      {(order as Order & { isDuplicate?: boolean }).isDuplicate && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm">
          <AlertTriangle size={18} className="shrink-0" />
          <span>Este cliente tiene otro pedido pendiente sin confirmar. Verifique si es duplicado.</span>
        </div>
      )}

      {/* Progress steps */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => {
            const done = i < currentIndex
            const active = i === currentIndex
            return (
              <div key={step.status} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-green-500' : active ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    {done ? <Check size={16} className="text-white" /> :
                     active ? <Circle size={16} className="text-white" fill="white" /> :
                     <Circle size={16} className="text-gray-400" />}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium text-center ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
        {/* Advance button */}
        {currentIndex < STEPS.length - 1 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => updateStatus.mutate(STEPS[currentIndex + 1].status)}
              disabled={updateStatus.isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Avanzar a "{STEPS[currentIndex + 1].label}"
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Client & shipping */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" />
            Información de Envío
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente</span>
              <span className="font-medium">{order.client?.name ?? order.client?.company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Destinatario</span>
              <span className="font-medium">{order.recipientName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dirección</span>
              <span className="font-medium text-right max-w-[200px]">{order.address ? `${order.address}, ${order.city ?? ''}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Transportadora</span>
              <span className="font-medium">{order.carrier ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Paga flete</span>
              <span className="font-medium">{order.freightPayer ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Forma pago flete</span>
              <span className="font-medium">{order.freightPayment ?? '—'}</span>
            </div>
          </div>
          {/* Dispatch date + Guide number */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <Calendar size={11} />
                Fecha de Despacho Comprometida
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  type="date"
                  value={dispatchDateDraft || (order.dispatchDate ? order.dispatchDate.slice(0, 10) : '')}
                  onChange={(e) => setDispatchDateDraft(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {dispatchDateDraft && dispatchDateDraft !== order.dispatchDate?.slice(0, 10) && (
                  <button
                    onClick={() => updateOrder.mutate({ dispatchDate: new Date(dispatchDateDraft).toISOString() })}
                    className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm transition-colors"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Número de Guía</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={guideNumberDraft}
                  onChange={(e) => setGuideNumberDraft(e.target.value)}
                  placeholder="Ingrese número de guía"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => updateOrder.mutate({ guideNumber: guideNumberDraft })}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Package size={16} className="text-blue-600" />
            Productos ({order.items?.length ?? 0})
          </h2>
          {/* Bypass banner: todos los ítems en STOCK */}
          {order.status === 'CONFIRMADO' &&
            (order.items ?? []).length > 0 &&
            (order.items ?? []).every(i => i.disposition === 'STOCK') && (
            <div className="mb-3 flex items-center justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Todos los productos están en stock</p>
                  <p className="text-xs text-green-600">No requiere producción — puede avanzar directo a Empacado</p>
                </div>
              </div>
              <button
                onClick={() => updateStatus.mutate('EMPACADO')}
                disabled={updateStatus.isPending}
                className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                → Empacar ahora
              </button>
            </div>
          )}
          <div className="space-y-2">
            {(order.items ?? []).map((item) => {
              const disp: ItemDisposition = item.disposition ?? 'PENDIENTE'
              return (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => markPicked.mutate({ itemId: item.id, picked: !item.picked })}
                      disabled={markPicked.isPending}
                      title={item.picked ? 'Marcar como pendiente' : 'Marcar como recolectado'}
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors border-2 ${item.picked ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 hover:border-green-400 text-transparent hover:text-green-400'}`}
                    >
                      <Check size={12} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">{item.product?.reference} · x{item.qty} · Stock: {item.product?.stock ?? '—'}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCOP(item.qty * item.unitPrice)}</span>
                  </div>
                  <div className="flex gap-1 pl-8">
                    {(['PENDIENTE', 'STOCK', 'PRODUCCION'] as ItemDisposition[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => updateDisposition.mutate({ itemId: item.id, disposition: d })}
                        disabled={updateDisposition.isPending}
                        className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                          disp === d ? DISPOSITION_ACTIVE[d] : DISPOSITION_COLORS[d]
                        }`}
                      >
                        {DISPOSITION_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-gray-900">{formatCOP(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Photo upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Fotos del Pedido</h2>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors"
            >
              <Upload size={12} />📦 Empaque
            </button>
            <button
              onClick={() => remiteRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 rounded-lg text-xs hover:bg-blue-100 transition-colors text-blue-700"
            >
              <Upload size={12} />🏷️ Remite
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto.mutate({ file: f, phase: 'EMPAQUE' }) }} />
          <input ref={remiteRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto.mutate({ file: f, phase: 'REMITE' }) }} />
        </div>
        {(order.photos ?? []).length > 0 ? (
          <div className="space-y-3">
            {(['EMPAQUE', 'REMITE', ''] as const).map((phase) => {
              const label = phase === 'EMPAQUE' ? '📦 Empaque' : phase === 'REMITE' ? '🏷️ Remite/Destino' : '📷 Sin categoría'
              const photos = (order.photos ?? []).filter((p: { phase?: string }) => (p.phase ?? '') === phase)
              if (photos.length === 0) return null
              return (
                <div key={phase || 'none'}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((photo: { id?: string; url: string }, i: number) => (
                      <img key={photo.id ?? i} src={photo.url} alt={`${label} ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(photo.url, '_blank')} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            <Upload size={28} className="mx-auto mb-2 opacity-40" />
            Sin fotos — usa los botones arriba para registrar el empaque y el remite
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Observaciones del pedido</h2>
        <textarea
          value={noteDraft || order.notes || ''}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Agrega notas o instrucciones especiales para este pedido..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        {noteDraft && noteDraft !== order.notes && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => { updateOrder.mutate({ notes: noteDraft }); setNoteDraft('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Save size={12} />
              Guardar nota
            </button>
          </div>
        )}
      </div>

      {/* Production orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Factory size={16} className="text-blue-600" />
            Órdenes de Producción
            {(order.productionOrders?.length ?? 0) > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                {order.productionOrders!.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => {
              const itemsForProd = (order.items ?? []).filter(i => i.disposition === 'PRODUCCION')
              if (itemsForProd.length === 1) {
                setOpProductId(itemsForProd[0].productId)
                setOpQty(itemsForProd[0].qty)
              }
              setOpRequired(order.dispatchDate ? order.dispatchDate.slice(0, 10) : '')
              setShowCreateOP(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={13} />
            Nueva OP
          </button>
        </div>

        {(order.productionOrders ?? []).length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
            <Factory size={28} className="mx-auto mb-2 opacity-30" />
            Sin órdenes de producción vinculadas
            {(order.items ?? []).some(i => i.disposition === 'PRODUCCION') && (
              <p className="mt-1 text-xs text-orange-500 font-medium">
                Hay productos marcados como "Producción" — crea una OP para cada uno
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(order.productionOrders ?? []).map((op) => (
              <div key={op.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600">#{op.number}</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{op.product?.name ?? '—'}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    x{op.qty} · {op.assignedUser?.name ?? 'Sin asignar'}
                    {op.requiredDate && <span className="ml-2 text-orange-600">· Req: {formatDate(op.requiredDate)}</span>}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PROD_STATUS_COLORS[op.status as ProductionStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {PROD_STATUS_LABELS[op.status as ProductionStatus] ?? op.status}
                </span>
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Production Order Modal */}
      {showCreateOP && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Nueva Orden de Producción</h3>
                <p className="text-xs text-gray-400 mt-0.5">Vinculada a Pedido #{order.number}</p>
              </div>
              <button onClick={() => setShowCreateOP(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Producto a fabricar</label>
                <select
                  value={opProductId}
                  onChange={(e) => {
                    setOpProductId(e.target.value)
                    const item = (order.items ?? []).find((i) => i.productId === e.target.value)
                    if (item) setOpQty(item.qty)
                  }}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {/* Primero mostrar los items del pedido con disposición PRODUCCION */}
                  {(order.items ?? []).filter(i => i.disposition === 'PRODUCCION').length > 0 && (
                    <optgroup label="— Para producción (este pedido)">
                      {(order.items ?? []).filter(i => i.disposition === 'PRODUCCION').map(i => (
                        <option key={i.productId} value={i.productId}>
                          {i.product?.reference} — {i.product?.name} (x{i.qty})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="— Todos los productos">
                    {(productsData?.data.data ?? []).map(p => (
                      <option key={p.id} value={p.id}>{p.reference} — {p.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Cantidad</label>
                  <input
                    type="number" min={1} value={opQty}
                    onChange={(e) => setOpQty(Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Fase inicial</label>
                  <select value={opPhase} onChange={(e) => setOpPhase(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Asignar a</label>
                  <select value={opAssignee} onChange={(e) => setOpAssignee(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Sin asignar</option>
                    {assignees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">
                    Fecha requerida
                    {order.dispatchDate && <span className="text-blue-500 ml-1">(desde despacho)</span>}
                  </label>
                  <input
                    type="date" value={opRequired}
                    onChange={(e) => setOpRequired(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowCreateOP(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => createOP.mutate()}
                disabled={!opProductId || createOP.isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createOP.isPending ? 'Creando...' : 'Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipments panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Truck size={16} className="text-emerald-600" />
            Despachos
            {shipments.length > 0 && (
              <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                {shipments.length}
              </span>
            )}
          </h2>
          {order.status !== 'CANCELADO' && order.status !== 'ENTREGADO' && (
            <button
              onClick={() => {
                const initialItems = (order.items ?? [])
                  .filter(i => (i.qty - (i.quantityShipped ?? 0)) > 0)
                  .map(i => ({ orderItemId: i.id, quantity: i.qty - (i.quantityShipped ?? 0) }))
                setShipmentItems(initialItems)
                setShipmentCarrier(order.carrier ?? '')
                setShowCreateShipment(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              <Plus size={13} />
              Nuevo Despacho
            </button>
          )}
        </div>

        {/* Progress bar */}
        {(order.items ?? []).length > 0 && (() => {
          const totalQty = (order.items ?? []).reduce((s, i) => s + i.qty, 0)
          const shippedQty = (order.items ?? []).reduce((s, i) => s + (i.quantityShipped ?? 0), 0)
          const pct = totalQty > 0 ? Math.round((shippedQty / totalQty) * 100) : 0
          return (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Despachado</span>
                <span className="font-medium">{shippedQty} / {totalQty} unidades ({pct}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })()}

        {shipments.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
            <Truck size={28} className="mx-auto mb-2 opacity-30" />
            Sin despachos registrados
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => (
              <div key={s.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600">D-{String(s.number).padStart(3, '0')}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SHIPMENT_STATUS_COLORS[s.status as ShipmentStatus]}`}>
                      {SHIPMENT_STATUS_LABELS[s.status as ShipmentStatus] ?? s.status}
                    </span>
                    {s.creditDispatch && (
                      <span className="text-xs flex items-center gap-0.5 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                        <CreditCard size={10} />
                        Crédito
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === 'DESPACHADO' && (
                      <button
                        onClick={() => updateShipmentMutation.mutate({ shipmentId: s.id, status: 'ENTREGADO' })}
                        className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        Marcar entregado
                      </button>
                    )}
                    {s.status === 'PREPARANDO' && (
                      <button
                        onClick={() => { if (confirm('¿Eliminar este despacho?')) deleteShipmentMutation.mutate(s.id) }}
                        className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {s.carrier && <p>Transportadora: <span className="text-gray-700">{s.carrier}</span></p>}
                  {s.trackingNumber && <p>Guía: <span className="font-mono text-gray-700">{s.trackingNumber}</span></p>}
                  {s.dispatchedAt && <p>Despachado: {formatDate(s.dispatchedAt)}</p>}
                </div>
                <div className="mt-2 space-y-1">
                  {(s.items ?? []).map((si) => (
                    <div key={si.id} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="text-gray-700">{si.orderItem?.product?.name ?? si.orderItemId}</span>
                      <span className="font-medium text-gray-900">x{si.quantity}</span>
                    </div>
                  ))}
                </div>
                {s.invoice && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg">
                    <CreditCard size={11} />
                    Factura #{s.invoice.number} — {formatCOP(s.invoice.amount)} — {s.invoice.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Shipment Modal */}
      {showCreateShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Registrar Despacho</h3>
                <p className="text-xs text-gray-400 mt-0.5">Pedido #{order.number} — {order.client?.name ?? order.clientId}</p>
              </div>
              <button onClick={() => setShowCreateShipment(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Items */}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-2">Productos a despachar</label>
                <div className="space-y-2">
                  {(order.items ?? []).map((oi) => {
                    const remaining = oi.qty - (oi.quantityShipped ?? 0)
                    const entry = shipmentItems.find(e => e.orderItemId === oi.id)
                    return (
                      <div key={oi.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{oi.product?.name ?? oi.productId}</p>
                          <p className="text-xs text-gray-400">Pendiente: {remaining} / {oi.qty}</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={entry?.quantity ?? 0}
                          onChange={(e) => {
                            const val = Math.min(Number(e.target.value), remaining)
                            setShipmentItems(prev => {
                              const without = prev.filter(x => x.orderItemId !== oi.id)
                              return val > 0 ? [...without, { orderItemId: oi.id, quantity: val }] : without
                            })
                          }}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Carrier & tracking */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Transportadora</label>
                  <input
                    type="text"
                    value={shipmentCarrier}
                    onChange={e => setShipmentCarrier(e.target.value)}
                    placeholder="Servientrega, TCC..."
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Número de guía</label>
                  <input
                    type="text"
                    value={shipmentTracking}
                    onChange={e => setShipmentTracking(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Notas</label>
                <textarea
                  value={shipmentNotes}
                  onChange={e => setShipmentNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Credit dispatch toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-purple-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={shipmentCredit}
                  onChange={e => setShipmentCredit(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <div>
                  <p className="text-sm font-medium text-purple-900">Despacho a crédito</p>
                  <p className="text-xs text-purple-600">Crea factura en cartera con vencimiento según días de pago del cliente</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowCreateShipment(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => createShipmentMutation.mutate()}
                disabled={shipmentItems.length === 0 || createShipmentMutation.isPending}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {createShipmentMutation.isPending ? 'Registrando...' : 'Registrar Despacho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
