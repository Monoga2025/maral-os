import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Flame,
  Clock,
  MessageCircle,
  Copy,
  Check,
  Zap,
  Search,
  Sparkles,
  TrendingUp,
  Building2,
  Phone,
} from 'lucide-react'
import { dashboardApi } from '../../lib/api'
import { formatCOP } from '../../lib/utils'
import type { ReactivationRadarClient } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface ReactivationRadarWidgetProps {
  onQuickQuoteForClient?: (client: { id: string; name: string }) => void
}

export function ReactivationRadarWidget({ onQuickQuoteForClient }: ReactivationRadarWidgetProps) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICO' | 'DORMIDO' | 'ENFRIANDOSE' | 'SEGUIMIENTO'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reactivation-radar'],
    queryFn: () => dashboardApi.getReactivationRadar().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const clients = data?.clients || []
  const summary = data?.summary || {
    totalOpportunities: 0,
    criticalCount: 0,
    dormantCount: 0,
    coolingCount: 0,
    followUpCount: 0,
    potentialRevenueCOP: 0,
  }

  const filteredClients = clients.filter((c) => {
    if (filter !== 'ALL' && c.urgency !== filter) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        c.primaryProduct.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleCopyPitch = (client: ReactivationRadarClient) => {
    navigator.clipboard.writeText(client.suggestedPitch)
    setCopiedId(client.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleOpenWhatsApp = (client: ReactivationRadarClient) => {
    if (!client.waNumber) return
    const text = encodeURIComponent(client.suggestedPitch)
    window.open(`https://wa.me/${client.waNumber}?text=${text}`, '_blank')
  }

  const getUrgencyBadge = (urgency: ReactivationRadarClient['urgency']) => {
    switch (urgency) {
      case 'CRITICO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
            <Flame className="h-3 w-3 text-rose-500" /> &gt;90d Sin Compra
          </span>
        )
      case 'DORMIDO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
            <Clock className="h-3 w-3 text-amber-600" /> 60-90d Dormido
          </span>
        )
      case 'ENFRIANDOSE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-200/80 px-2.5 py-0.5 text-[10px] font-bold text-yellow-800">
            <Clock className="h-3 w-3 text-yellow-600" /> 30-60d Enfriándose
          </span>
        )
      case 'SEGUIMIENTO':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
            <Sparkles className="h-3 w-3 text-blue-500" /> Oportunidad Activa
          </span>
        )
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50/60 via-slate-50/40 to-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Radar de Reactivación B2B
                </h3>
                <span className="rounded-md bg-amber-100/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase tracking-wide">
                  Generador de Caja
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Dispara propuestas de recompra automáticas con 1 click
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-1.5 border border-emerald-200/70">
            <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-600 font-medium">Caja potencial: </span>
              <span className="font-bold text-emerald-800">
                {formatCOP(summary.potentialRevenueCOP)}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilter('ALL')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Todos ({summary.totalOpportunities})
            </button>
            {summary.criticalCount > 0 && (
              <button
                onClick={() => setFilter('CRITICO')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  filter === 'CRITICO'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Críticos ({summary.criticalCount})
              </button>
            )}
            {summary.dormantCount > 0 && (
              <button
                onClick={() => setFilter('DORMIDO')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  filter === 'DORMIDO'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Dormidos ({summary.dormantCount})
              </button>
            )}
            {summary.coolingCount > 0 && (
              <button
                onClick={() => setFilter('ENFRIANDOSE')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  filter === 'ENFRIANDOSE'
                    ? 'bg-yellow-600 text-white shadow-xs'
                    : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
                }`}
              >
                Enfriándose ({summary.coolingCount})
              </button>
            )}
            <button
              onClick={() => setFilter('SEGUIMIENTO')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                filter === 'SEGUIMIENTO'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Seguimiento ({summary.followUpCount})
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente o producto..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-xs font-medium text-slate-500">
            No se encontraron clientes bajo este filtro.
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="group flex flex-col gap-3 p-4 sm:px-5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {client.name}
                    </h4>
                    {client.company && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        • {client.company}
                      </span>
                    )}
                    {getUrgencyBadge(client.urgency)}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                    <span>
                      LTV: <strong className="text-slate-800 font-semibold">{client.totalSpent > 0 ? formatCOP(client.totalSpent) : 'Prospección'}</strong>
                    </span>
                    <span>• {client.daysInactive === 0 ? 'Reciente' : `${client.daysInactive}d sin compra`}</span>
                    {client.primaryProduct && (
                      <span className="truncate max-w-[240px] text-slate-600 font-medium italic">
                        • {client.primaryProduct}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyPitch(client)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    title="Copiar propuesta personalizada"
                  >
                    {copiedId === client.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenWhatsApp(client)}
                    disabled={!client.waNumber}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-40"
                    title="Enviar mensaje por WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() =>
                      onQuickQuoteForClient?.({
                        id: client.id,
                        name: client.company ? `${client.name} (${client.company})` : client.name,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition-colors"
                    title="Crear Cotización Flash en 30 segundos"
                  >
                    <Zap className="h-3.5 w-3.5 text-indigo-200" />
                    <span>Cotizar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
