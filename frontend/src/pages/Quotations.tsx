import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus,
  Search,
  FileText,
  Copy,
  Trash2,
  ArrowRight,
  X,
  Download,
  Pencil,
  Eye,
  Factory,
} from 'lucide-react'
import { toast } from 'sonner'
import { quotationsApi } from '../lib/api'
import { formatCOP, formatDate, getDaysUntil } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table'
import { QuotationStatusBadge } from '../components/ui/StatusBadge'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/LoadingSkeleton'
import { Card } from '../components/ui/Card'
import type { QuotationStatus, Quotation as QuotationType } from '../types'
import type { ConvertToOrderRequest } from '../lib/contracts'
import { TourButton } from '../components/tour/TourButton'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'RECHAZADA', label: 'Rechazada' },
  { value: 'CONVERTIDA', label: 'Convertida' },
]

// Devuelve clase CSS según antigüedad de la cotización (solo para estados activos)
function getDateAgeClass(createdAt: string, status: string): string {
  if (['APROBADA', 'RECHAZADA', 'CONVERTIDA'].includes(status)) return 'text-gray-500'
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
  if (days <= 7) return 'text-green-600 font-medium'
  if (days <= 30) return 'text-amber-500 font-medium'
  return 'text-red-500 font-semibold'
}

const CARRIERS = ['Cualquiera', 'Servientrega', 'Interrapidísimo', 'Coordinadora', 'TCC', 'Envia', 'Otro']

interface ConvertModalProps {
  quotationId: string
  clientName: string
  clientPhone?: string
  clientAddress?: string
  clientCity?: string
  onClose: () => void
  onConfirm: (data: ConvertToOrderRequest) => void
  loading: boolean
}

function ConvertModal({ quotationId: _id, clientName, clientPhone, clientAddress, clientCity, onClose, onConfirm, loading }: ConvertModalProps) {
  const [form, setForm] = useState<ConvertToOrderRequest>({
    recipientName: clientName,
    address: clientAddress ?? '',
    city: clientCity ?? '',
    phone: clientPhone ?? '',
    carrier: 'Cualquiera',
    freightPayer: 'DESTINATARIO',
    freightPayment: 'CONTADO',
    type: 'PEDIDO',
    notes: '',
  })

  const set = (field: keyof ConvertToOrderRequest, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <p className="font-semibold text-gray-900">Convertir a Pedido</p>
            <p className="text-xs text-gray-500 mt-0.5">Datos de envío para el pedido</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Destinatario *</label>
              <input
                required
                value={form.recipientName}
                onChange={(e) => set('recipientName', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección *</label>
              <input
                required
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad *</label>
              <input
                required
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transportadora *</label>
              <select
                required
                value={form.carrier}
                onChange={(e) => set('carrier', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value as 'PEDIDO' | 'GARANTIA' | 'MUESTRA')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PEDIDO">Pedido</option>
                <option value="GARANTIA">Garantía</option>
                <option value="MUESTRA">Muestra</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Flete paga</label>
              <select
                value={form.freightPayer}
                onChange={(e) => set('freightPayer', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DESTINATARIO">Destinatario</option>
                <option value="REMITENTE">Remitente (Maral)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pago flete</label>
              <select
                value={form.freightPayment}
                onChange={(e) => set('freightPayment', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={loading} leftIcon={<ArrowRight className="h-4 w-4" />}>
              Crear Pedido
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProductionOrderModal({
  quotation, loading, onClose, onConfirm,
}: {
  quotation: QuotationType
  loading: boolean
  onClose: () => void
  onConfirm: (items: { productId: string; qty: number }[]) => void
}) {
  const [selected, setSelected] = useState<Record<string, { checked: boolean; qty: number }>>(
    Object.fromEntries((quotation.items ?? []).map((i) => [i.productId, { checked: true, qty: i.qty }]))
  )

  const toggle = (productId: string) =>
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], checked: !prev[productId].checked } }))

  const setQty = (productId: string, qty: number) =>
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], qty: Math.max(1, qty) } }))

  const handleSubmit = () => {
    const items = Object.entries(selected)
      .filter(([, v]) => v.checked)
      .map(([productId, v]) => ({ productId, qty: v.qty }))
    if (items.length === 0) return
    onConfirm(items)
  }

  const checkedCount = Object.values(selected).filter((v) => v.checked).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Enviar a Producción</h2>
            <p className="text-xs text-gray-500 mt-0.5">Selecciona los ítems a producir</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
        </div>

        <div className="px-5 py-4 space-y-2 max-h-80 overflow-y-auto">
          {(quotation.items ?? []).map((item) => {
            const sel = selected[item.productId]
            return (
              <div key={item.productId} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${sel?.checked ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={sel?.checked ?? false}
                  onChange={() => toggle(item.productId)}
                  className="h-4 w-4 rounded accent-orange-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name ?? item.productId}</p>
                  <p className="text-xs text-gray-400">{item.product?.reference}</p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={sel?.qty ?? item.qty}
                  onChange={(e) => setQty(item.productId, Number(e.target.value))}
                  disabled={!sel?.checked}
                  className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-40"
                />
                <span className="text-xs text-gray-400 w-8">{item.product?.unit ?? 'und'}</span>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || checkedCount === 0}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Factory className="h-4 w-4" />}
            Crear {checkedCount} OP{checkedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Quotations() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [page, setPage] = useState(1)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null)
  const [convertingQuotation, setConvertingQuotation] = useState<{
    id: string; clientName: string; clientPhone?: string; clientAddress?: string; clientCity?: string
  } | null>(null)
  const [productionQuotation, setProductionQuotation] = useState<QuotationType | null>(null)
  const [loadingProductionId, setLoadingProductionId] = useState<string | null>(null)

  const openProductionModal = async (q: { id: string }) => {
    setLoadingProductionId(q.id)
    try {
      const res = await quotationsApi.getById(q.id)
      setProductionQuotation(res.data as unknown as QuotationType)
    } catch {
      toast.error('Error al cargar cotización')
    } finally {
      setLoadingProductionId(null)
    }
  }
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Flash la fila recién creada si viene con state.newId
  useEffect(() => {
    const newId = (location.state as { newId?: string } | null)?.newId
    if (newId) {
      setFlashId(newId)
      // limpiar state del navegador para que recarga no vuelva a flashear
      window.history.replaceState({}, '')
      flashTimeout.current = setTimeout(() => setFlashId(null), 2500)
    }
    return () => { if (flashTimeout.current) clearTimeout(flashTimeout.current) }
  }, [location.state])

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', { search, status: statusTab, page }],
    queryFn: async () => {
      if (statusTab === 'all') {
        return quotationsApi
          .getAll({ search: search || undefined, page, pageSize: 20 })
          .then((r) => r.data)
      }
      if (statusTab === 'active') {
        // Fetch BORRADOR + ENVIADA merged (two calls, combined client-side)
        const [borradores, enviadas] = await Promise.all([
          quotationsApi.getAll({ search: search || undefined, status: 'BORRADOR', page, pageSize: 10 }).then((r) => r.data),
          quotationsApi.getAll({ search: search || undefined, status: 'ENVIADA', page, pageSize: 10 }).then((r) => r.data),
        ])
        const combined = [...(borradores.data ?? []), ...(enviadas.data ?? [])]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        return {
          data: combined,
          pagination: {
            total: (borradores.pagination?.total ?? 0) + (enviadas.pagination?.total ?? 0),
            page,
            pages: 1,
            limit: 20,
          },
        }
      }
      return quotationsApi
        .getAll({
          search: search || undefined,
          status: statusTab,
          page,
          pageSize: 20,
        })
        .then((r) => r.data)
    },
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertToOrderRequest }) =>
      quotationsApi.convertToOrder(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Cotización convertida a pedido')
      setConvertingQuotation(null)
      navigate(`/pedidos/${res.data.id}`)
    },
    onError: () => toast.error('Error al convertir cotización'),
  })

  const productionOrderMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: { productId: string; qty: number }[] }) =>
      quotationsApi.createProductionOrder(id, items),
    onSuccess: (res) => {
      toast.success(`${res.data.productionOrders.length} orden(es) de producción creadas`)
      setProductionQuotation(null)
    },
    onError: () => toast.error('Error al crear órdenes de producción'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Cotización duplicada')
    },
    onError: () => toast.error('Error al duplicar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Cotización eliminada')
    },
    onError: () => toast.error('No se puede eliminar esta cotización'),
  })

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      quotationsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setChangingStatusId(null)
      toast.success('Estado actualizado')
    },
    onError: () => toast.error('Error al cambiar estado'),
  })

  return (
    <div className="space-y-5">
      {convertingQuotation && (
        <ConvertModal
          quotationId={convertingQuotation.id}
          clientName={convertingQuotation.clientName}
          clientPhone={convertingQuotation.clientPhone}
          clientAddress={convertingQuotation.clientAddress}
          clientCity={convertingQuotation.clientCity}
          loading={convertMutation.isPending}
          onClose={() => setConvertingQuotation(null)}
          onConfirm={(formData) => convertMutation.mutate({ id: convertingQuotation.id, data: formData })}
        />
      )}

      {productionQuotation && (
        <ProductionOrderModal
          quotation={productionQuotation}
          loading={productionOrderMutation.isPending}
          onClose={() => setProductionQuotation(null)}
          onConfirm={(items) => productionOrderMutation.mutate({ id: productionQuotation.id, items })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data?.pagination?.total ?? 0} cotizaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="cotizaciones" />
          <Button
            data-tour="new-quotation-btn"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/cotizaciones/nueva')}
          >
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Status tabs + search */}
      <Card>
        <div className="p-4 space-y-3">
          <Input
            data-tour="quotation-search"
            placeholder="Buscar por número, cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            prefix={<Search className="h-4 w-4" />}
          />
          <Tabs
            defaultValue="all"
            value={statusTab}
            onValueChange={(v) => {
              setStatusTab(v)
              setPage(1)
            }}
          >
            <TabsList data-tour="status-tabs" className="flex-wrap">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Table */}
      <Card data-tour="quotation-table" className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : !data?.data?.length ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No hay cotizaciones"
            description="Crea tu primera cotización para un cliente"
            action={{
              label: 'Nueva Cotización',
              onClick: () => navigate('/cotizaciones/nueva'),
            }}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Válida hasta</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((q) => {
                  const daysLeft = getDaysUntil(q.validUntil)
                  const isOverdueFollowup =
                    q.followUpDate &&
                    new Date(q.followUpDate) < new Date() &&
                    q.status !== 'APROBADA' &&
                    q.status !== 'RECHAZADA' &&
                    q.status !== 'CONVERTIDA'

                  return (
                    <TableRow
                      key={q.id}
                      className={`cursor-pointer ${q.id === flashId ? 'row-flash' : ''}`}
                      onClick={async () => {
                        setViewingId(q.id)
                        try { await quotationsApi.viewPDF(q.id) }
                        catch { toast.error('Error al abrir PDF') }
                        finally { setViewingId(null) }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isOverdueFollowup && (
                            <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" title="Seguimiento vencido" />
                          )}
                          <span className="font-semibold text-blue-600 hover:underline">
                            {q.number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {q.client?.name}
                          </p>
                          {q.client?.company && (
                            <p className="text-xs text-gray-500">
                              {q.client.company}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={getDateAgeClass(q.createdAt, q.status)}>
                          {formatDate(q.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-gray-600">
                            {formatDate(q.validUntil)}
                          </span>
                          {daysLeft < 0 ? (
                            <span className="ml-1.5 text-xs text-red-500">
                              Expirada
                            </span>
                          ) : (q.validUntil && daysLeft <= 3) ? (
                            <span className="ml-1.5 text-xs text-orange-500">
                              {daysLeft}d
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCOP(q.total)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {changingStatusId === q.id ? (
                          <select
                            autoFocus
                            defaultValue={q.status}
                            onBlur={() => setChangingStatusId(null)}
                            onChange={(e) => {
                              if (e.target.value !== q.status) {
                                changeStatusMutation.mutate({ id: q.id, status: e.target.value })
                              } else {
                                setChangingStatusId(null)
                              }
                            }}
                            className="rounded-lg border border-blue-400 px-2 py-1 text-xs focus:outline-none bg-white"
                          >
                            {['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA'].map((s) => (
                              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            title="Clic para cambiar estado"
                            onClick={() => q.status !== 'CONVERTIDA' && setChangingStatusId(q.id)}
                            className={q.status !== 'CONVERTIDA' ? 'hover:opacity-75 transition-opacity' : ''}
                          >
                            <QuotationStatusBadge status={q.status as QuotationStatus} />
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">
                          {q.seller?.name?.split(' ')[0] ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(q.status === 'ENVIADA' || q.status === 'APROBADA' || q.status === 'BORRADOR') && (
                            <button
                              onClick={() => setConvertingQuotation({
                                id: q.id,
                                clientName: q.client?.name ?? '',
                                clientPhone: q.client?.phone,
                                clientAddress: q.client?.address,
                                clientCity: q.client?.city,
                              })}
                              className="flex h-7 items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                              title="Convertir a pedido"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              Pedido
                            </button>
                          )}
                          {q.status === 'APROBADA' && ((q as any)._count?.items ?? 0) > 0 && (
                            <button
                              onClick={() => openProductionModal(q)}
                              disabled={loadingProductionId === q.id}
                              className="flex h-7 items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
                              title="Enviar a producción"
                            >
                              {loadingProductionId === q.id
                                ? <div className="h-3.5 w-3.5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                                : <Factory className="h-3.5 w-3.5" />}
                              Producción
                            </button>
                          )}
                          {q.status !== 'CONVERTIDA' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/cotizaciones/${q.id}/editar`)
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            disabled={viewingId === q.id}
                            onClick={async (e) => {
                              e.stopPropagation()
                              setViewingId(q.id)
                              try { await quotationsApi.viewPDF(q.id) }
                              catch { toast.error('Error al abrir PDF') }
                              finally { setViewingId(null) }
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            title="Ver PDF"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            disabled={downloadingId === q.id}
                            onClick={async (e) => {
                              e.stopPropagation()
                              setDownloadingId(q.id)
                              try {
                                await quotationsApi.downloadPDF(q.id, q.number, q.client?.name ?? q.client?.company)
                              } catch {
                                toast.error('Error al generar PDF')
                              } finally {
                                setDownloadingId(null)
                              }
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            title="Descargar PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateMutation.mutate(q.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                            title="Duplicar"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {(q.status === 'BORRADOR' || q.status === 'RECHAZADA') && (
                            <button
                              onClick={() => {
                                if (confirm('¿Eliminar esta cotización?')) {
                                  deleteMutation.mutate(q.id)
                                }
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={data.pagination.pages}
              total={data.pagination.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  )
}
