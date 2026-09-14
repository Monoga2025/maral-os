import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  TrendingUp,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Check,
  Copy,
  DollarSign,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react'
import { competitorsApi } from '../../lib/api'
import { formatCOP } from '../../lib/utils'
import type { CompetitorComparisonItem } from '../../types'

interface SyscomRadarWidgetProps {
  onQuickQuoteForRef?: (ref: string, name: string) => void
}

export function SyscomRadarWidget({ onQuickQuoteForRef }: SyscomRadarWidgetProps) {
  const [category, setCategory] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [scrapeSuccessMsg, setScrapeSuccessMsg] = useState<string | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['syscom-comparison', category, searchTerm],
    queryFn: () => competitorsApi.getSyscomComparison({ category, search: searchTerm }).then((r) => r.data),
    refetchInterval: 120_000,
  })

  const scrapeMutation = useMutation({
    mutationFn: () => competitorsApi.triggerSyscomScrape(),
    onSuccess: (res) => {
      setScrapeSuccessMsg(res.data.message)
      refetch()
      setTimeout(() => setScrapeSuccessMsg(null), 4000)
    },
  })

  const items = data?.items || []
  const summary = data?.summary || {
    totalProductsTracked: 0,
    averageSavingsPercentage: 25,
    totalPriceAdvantageCOP: 0,
    syscomOutOrSlowCount: 0,
    lastScrapedAt: new Date().toISOString(),
    trmApplied: 4150,
  }

  const handleCopyPitch = (item: CompetitorComparisonItem) => {
    navigator.clipboard.writeText(item.killerPitch)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const getSyscomBadge = (availability: CompetitorComparisonItem['syscomAvailability']) => {
    switch (availability) {
      case 'SIN_STOCK':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            <AlertTriangle className="h-3 w-3 text-rose-500" /> Syscom: AGOTADO
          </span>
        )
      case 'IMPORTACION_15D':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <Clock className="h-3 w-3 text-amber-600" /> Syscom: 15 Días
          </span>
        )
      case 'STOCK_LIMITADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-yellow-50 border border-yellow-200 px-2 py-0.5 text-[10px] font-bold text-yellow-800">
            <Clock className="h-3 w-3 text-yellow-600" /> Syscom: Limitado
          </span>
        )
      case 'DISPONIBLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            Syscom: Disponible
          </span>
        )
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-slate-50/40 to-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Radar de Competencia & Precios (vs Syscom)
                </h3>
                <span className="rounded-md bg-blue-100/80 px-2 py-0.5 text-[10px] font-extrabold text-blue-900 uppercase tracking-wide">
                  INTELIGENCIA DE MERCADO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Detecta sobreprecios y faltantes de stock en Syscom para arrebatar pedidos en 24h
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrapeMutation.mutate()}
              disabled={scrapeMutation.isPending || isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
              title="Escanear catálogo de Syscom en tiempo real"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scrapeMutation.isPending || isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>{scrapeMutation.isPending ? 'Escaneando...' : 'Escanear Syscom'}</span>
            </button>

            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 border border-emerald-200/70 text-xs">
              <span className="text-slate-600 font-medium">Ahorro Promedio:</span>
              <span className="font-bold text-emerald-800">
                {summary.averageSavingsPercentage}% MENOS
              </span>
            </div>
          </div>
        </div>

        {scrapeSuccessMsg && (
          <div className="mt-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>{scrapeSuccessMsg}</span>
          </div>
        )}

        {/* Filter Pills & Search */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Todas las Líneas' },
              { id: 'ANTENAS_BASE', label: 'Antenas Base' },
              { id: 'ANTENAS_MOVILES', label: 'Antenas Móviles' },
              { id: 'DIPOLOS', label: 'Dipolos & Arreglos' },
              { id: 'CABLES', label: 'Cables Coaxiales' },
              { id: 'CONECTORES', label: 'Conectores RF' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  category === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar antena o referencia..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs font-medium text-slate-500">
            No hay productos bajo este criterio de búsqueda.
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col gap-3 p-4 sm:px-5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {item.maralName}
                    </h4>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Ref: {item.maralRef}
                    </span>
                    {getSyscomBadge(item.syscomAvailability)}
                  </div>

                  {/* Price Comparison Metric Row */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Precio Maral:</span>
                      <strong className="text-emerald-700 font-bold">{formatCOP(item.maralPriceCOP)}</strong>
                      <span className="text-[11px] text-slate-400 font-normal">({item.maralStock} en stock)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Syscom Colombia:</span>
                      <span className="line-through text-slate-400">{formatCOP(item.syscomPriceCOP)}</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      <span>Ahorro cliente: {formatCOP(item.priceDiffCOP)} ({item.savingsPercentage}% OFF)</span>
                    </div>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500 italic line-clamp-1">
                    "{item.killerPitch}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyPitch(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    title="Copiar argumento de venta contra Syscom"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copiar Argumento</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onQuickQuoteForRef?.(item.maralRef, item.maralName)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors"
                    title="Generar cotización flash con esta referencia"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span>Cotizar Flash</span>
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
