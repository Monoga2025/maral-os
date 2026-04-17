import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ordersApi } from '../../lib/api'
import { formatCOP, formatDate } from '../../lib/utils'
import type { OrderStatus } from '../../types'

const STATUS_CHIPS: { label: string; value: OrderStatus | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Confirmado', value: 'CONFIRMADO' },
  { label: 'En producción', value: 'EN_PRODUCCION' },
  { label: 'Empacado', value: 'EMPACADO' },
  { label: 'Despachado', value: 'DESPACHADO' },
  { label: 'Entregado', value: 'ENTREGADO' },
  { label: 'Cancelado', value: 'CANCELADO' },
]

const STATUS_COLORS: Record<string, string> = {
  CONFIRMADO: 'bg-blue-900 text-blue-300',
  EN_PRODUCCION: 'bg-orange-900 text-orange-300',
  EMPACADO: 'bg-purple-900 text-purple-300',
  DESPACHADO: 'bg-indigo-900 text-indigo-300',
  ENTREGADO: 'bg-[#14532D] text-[#22C55E]',
  CANCELADO: 'bg-red-900 text-red-300',
}

export default function MobileOrders() {
  const navigate = useNavigate()
  const [activeStatus, setActiveStatus] = useState<OrderStatus | ''>('')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', activeStatus],
    queryFn: () =>
      ordersApi
        .getAll({ status: activeStatus || undefined, pageSize: 20 })
        .then((r) => r.data),
  })

  const orders = data?.data ?? []

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[#F1F5F9] text-2xl font-bold">Pedidos</h1>
        <button
          onClick={() => navigate('/pedidos/nuevo')}
          className="w-9 h-9 bg-[#22C55E] rounded-full flex items-center justify-center"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setActiveStatus(chip.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              activeStatus === chip.value
                ? 'bg-[#22C55E] text-white'
                : 'bg-[#141C26] border border-[#1E2D3D] text-[#94A3B8]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#141C26] rounded-2xl p-4 border border-[#1E2D3D] animate-pulse"
            >
              <div className="h-3 bg-[#1E2D3D] rounded w-24 mb-2" />
              <div className="h-5 bg-[#1E2D3D] rounded w-40 mb-3" />
              <div className="flex justify-between">
                <div className="h-5 bg-[#1E2D3D] rounded w-28" />
                <div className="h-4 bg-[#1E2D3D] rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[#475569] text-sm">Sin pedidos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => navigate(`/pedidos/${order.id}`)}
              className="w-full bg-[#141C26] rounded-2xl p-4 border border-[#1E2D3D] text-left"
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-[#94A3B8] text-xs">
                    Pedido #{order.number}
                  </p>
                  <p className="font-semibold text-[#F1F5F9] truncate">
                    {order.client?.name ?? '—'}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    STATUS_COLORS[order.status] ?? 'bg-[#1E2D3D] text-[#94A3B8]'
                  }`}
                >
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3 flex justify-between items-baseline">
                <p className="text-[#22C55E] font-bold text-lg">
                  {formatCOP(order.total)}
                </p>
                <p className="text-[#475569] text-xs">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
