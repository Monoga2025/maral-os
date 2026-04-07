import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, LayoutGrid, List, Clock, Package, Truck, CheckCircle2,
  Eye, ChevronRight,
} from 'lucide-react'
import { ordersApi } from '../lib/api'
import { formatCOP, formatDate, getDaysAgo, getStatusColor } from '../lib/utils'
import type { Order, OrderStatus } from '../types'
import { toast } from 'sonner'
import { TourButton } from '../components/tour/TourButton'
import { Hint } from '../components/ui/Hint'

const STATUSES: { key: OrderStatus; label: string; icon: React.ReactNode; color: string; dropColor: string }[] = [
  { key: 'CONFIRMADO',    label: 'Confirmado',    icon: <Clock size={14} />,        color: 'border-blue-400 bg-blue-50',   dropColor: 'bg-blue-100' },
  { key: 'EN_PRODUCCION', label: 'En Producción', icon: <Package size={14} />,      color: 'border-orange-400 bg-orange-50', dropColor: 'bg-orange-100' },
  { key: 'EMPACADO',      label: 'Empacado',      icon: <Package size={14} />,      color: 'border-purple-400 bg-purple-50', dropColor: 'bg-purple-100' },
  { key: 'DESPACHADO',    label: 'Despachado',    icon: <Truck size={14} />,        color: 'border-indigo-400 bg-indigo-50', dropColor: 'bg-indigo-100' },
  { key: 'ENTREGADO',     label: 'Entregado',     icon: <CheckCircle2 size={14} />, color: 'border-green-400 bg-green-50',  dropColor: 'bg-green-100' },
]

const nextStatus: Record<string, OrderStatus> = {
  CONFIRMADO: 'EN_PRODUCCION',
  EN_PRODUCCION: 'EMPACADO',
  EMPACADO: 'DESPACHADO',
  DESPACHADO: 'ENTREGADO',
}

export default function Orders() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dragOverCol, setDragOverCol] = useState<OrderStatus | null>(null)
  const draggedId = useRef<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, statusFilter],
    queryFn: () => ordersApi.getAll({ search: search || undefined, status: statusFilter || undefined, pageSize: 100 }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Estado actualizado')
    },
    onError: () => toast.error('Error al actualizar estado'),
  })

  const orders: Order[] = data?.data.data ?? []
  const byStatus = (status: OrderStatus) => orders.filter((o) => o.status === status)

  // ── Drag handlers ─────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, orderId: string) => {
    draggedId.current = orderId
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent, col: OrderStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(col)
  }

  const onDrop = (e: React.DragEvent, col: OrderStatus) => {
    e.preventDefault()
    setDragOverCol(null)
    if (!draggedId.current) return
    const order = orders.find((o) => o.id === draggedId.current)
    if (!order || order.status === col) return
    updateStatus.mutate({ id: draggedId.current, status: col })
    draggedId.current = null
  }

  const onDragLeave = () => setDragOverCol(null)
  const onDragEnd = () => { draggedId.current = null; setDragOverCol(null) }

  if (isLoading && !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} pedidos activos</p>
        </div>
        <div className="flex items-center gap-3">
          <TourButton tourId="pedidos" />
          <div data-tour="view-toggle" className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'kanban' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={16} />
            </button>
          </div>
          <button
            data-tour="new-order-btn"
            onClick={() => navigate('/pedidos/nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por cliente, número..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div data-tour="kanban-board" className="grid grid-cols-5 gap-4 overflow-x-auto">
          {STATUSES.map(({ key, label, color, dropColor }) => {
            const col = byStatus(key)
            const isOver = dragOverCol === key
            return (
              <div
                key={key}
                data-tour={key === 'CONFIRMADO' ? 'kanban-col-confirmado' : undefined}
                className="min-w-[220px]"
                onDragOver={(e) => onDragOver(e, key)}
                onDrop={(e) => onDrop(e, key)}
                onDragLeave={onDragLeave}
              >
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-t-4 ${color}`}>
                  <span className="font-semibold text-sm text-gray-700">{label}</span>
                  <span className="bg-white text-gray-700 text-xs font-bold rounded-full px-2 py-0.5 shadow-sm">
                    {col.length}
                  </span>
                </div>
                <div className={`rounded-b-xl p-2 space-y-2 min-h-[400px] transition-colors ${isOver ? dropColor : 'bg-gray-100'}`}>
                  {col.map((order) => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, order.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                      className="bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-gray-100 select-none"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-bold text-blue-600">#{order.number}</span>
                        <span className="text-xs text-gray-400">{getDaysAgo(order.createdAt)}d</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {order.client?.name ?? order.client?.company ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.items?.length ?? 0} items</p>
                      <p className="text-sm font-bold text-gray-900 mt-2">{formatCOP(order.total)}</p>
                      {nextStatus[key] && (
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateStatus.mutate({ id: order.id, status: nextStatus[key] })
                            }}
                            className="flex-1 text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 border border-blue-200 rounded py-1 hover:bg-blue-50 transition-colors"
                          >
                            Avanzar <ChevronRight size={12} />
                          </button>
                          <Hint
                            text={`Mueve este pedido al siguiente estado: ${nextStatus[key].replace('_', ' ')}`}
                            side="top"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length === 0 && (
                    <div className={`text-center py-8 text-xs transition-colors ${isOver ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                      {isOver ? 'Suelta aquí' : 'Sin pedidos'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === 'table' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#', 'Cliente', 'Tipo', 'Estado', 'Transportadora', 'Total', 'Fecha', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/pedidos/${order.id}`)}
                >
                  <td className="px-4 py-3 font-bold text-blue-600">#{order.number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {order.client?.name ?? order.client?.company ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{order.type ?? 'Pedido'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.carrier ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(order.total)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Eye size={16} className="text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Package size={40} className="mx-auto mb-2 opacity-40" />
              <p>No hay pedidos</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
