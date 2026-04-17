import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { quotationsApi } from '../../lib/api'
import { formatCOP, formatDate, getDaysUntil } from '../../lib/utils'
import type { QuotationStatus } from '../../types'

const STATUS_CHIPS: { label: string; value: QuotationStatus | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Borrador', value: 'BORRADOR' },
  { label: 'Enviada', value: 'ENVIADA' },
  { label: 'Aprobada', value: 'APROBADA' },
  { label: 'Rechazada', value: 'RECHAZADA' },
]

const STATUS_COLORS: Record<QuotationStatus, string> = {
  BORRADOR: 'bg-[#1E2D3D] text-[#94A3B8]',
  ENVIADA: 'bg-blue-900 text-blue-300',
  APROBADA: 'bg-[#14532D] text-[#22C55E]',
  RECHAZADA: 'bg-red-900 text-red-300',
  CONVERTIDA: 'bg-indigo-900 text-indigo-300',
}

export default function MobileQuotations() {
  const navigate = useNavigate()
  const [activeStatus, setActiveStatus] = useState<QuotationStatus | ''>('')

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', activeStatus],
    queryFn: () =>
      quotationsApi
        .getAll({ status: activeStatus || undefined, pageSize: 20 })
        .then((r) => r.data),
  })

  const quotations = data?.data ?? []

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[#F1F5F9] text-2xl font-bold">Cotizaciones</h1>
        <button
          onClick={() => navigate('/cotizaciones/nueva')}
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

      {/* Quotations list */}
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
                <div className="h-4 bg-[#1E2D3D] rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[#475569] text-sm">Sin cotizaciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => {
            const daysLeft = q.validUntil ? getDaysUntil(q.validUntil) : null
            const expiryLabel =
              daysLeft === null
                ? null
                : daysLeft < 0
                ? 'Vencida'
                : daysLeft === 0
                ? 'Vence hoy'
                : `Vence en ${daysLeft}d`

            return (
              <button
                key={q.id}
                onClick={() => navigate(`/cotizaciones/${q.id}`)}
                className="w-full bg-[#141C26] rounded-2xl p-4 border border-[#1E2D3D] text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-[#94A3B8] text-xs">
                      COT-{String(q.number).padStart(5, '0')}
                    </p>
                    <p className="font-semibold text-[#F1F5F9] truncate">
                      {q.client?.name ?? '—'}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      STATUS_COLORS[q.status] ??
                      'bg-[#1E2D3D] text-[#94A3B8]'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <div className="mt-3 flex justify-between items-baseline">
                  <p className="text-[#22C55E] font-bold text-lg">
                    {formatCOP(q.total)}
                  </p>
                  <div className="text-right">
                    {expiryLabel && (
                      <p
                        className={`text-xs ${
                          daysLeft !== null && daysLeft <= 3
                            ? 'text-red-400'
                            : 'text-[#475569]'
                        }`}
                      >
                        {expiryLabel}
                      </p>
                    )}
                    <p className="text-[#475569] text-xs">
                      {formatDate(q.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
