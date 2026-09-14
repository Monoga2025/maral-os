import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield,
  Truck,
  Wrench,
  Building,
  Phone,
  MessageCircle,
  Copy,
  Check,
  UserPlus,
  Zap,
  Search,
  Filter,
  TrendingUp,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { prospectingApi } from '../../lib/api'
import { formatCOP } from '../../lib/utils'
import type { B2BProspect } from '../../types'

interface B2BProspectorWidgetProps {
  onQuickQuoteForProspect?: (client: { id: string; name: string }) => void
}

export function B2BProspectorWidget({ onQuickQuoteForProspect }: B2BProspectorWidgetProps) {
  const queryClient = useQueryClient()
  const [sectorFilter, setSectorFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [convertedMsg, setConvertedMsg] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['prospecting-leads', sectorFilter, deptFilter, searchTerm],
    queryFn: () => prospectingApi.getLeads({ sector: sectorFilter, department: deptFilter, search: searchTerm }).then((r) => r.data),
    refetchInterval: 120_000,
  })

  const convertMutation = useMutation({
    mutationFn: (prospectId: string) => prospectingApi.convertToClient(prospectId),
    onSuccess: (res, prospectId) => {
      setConvertedMsg(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['prospecting-leads'] })
      setTimeout(() => setConvertedMsg(null), 4000)

      if (onQuickQuoteForProspect && res.data.client) {
        onQuickQuoteForProspect({
          id: res.data.client.id,
          name: `${res.data.client.name} (${res.data.client.company || 'Empresa'})`,
        })
      }
    },
  })

  const leads = data?.leads || []
  const summary = data?.summary || {
    totalLeads: 0,
    totalPipelineValueCOP: 0,
    securityLeadsCount: 0,
    transportLeadsCount: 0,
    installerLeadsCount: 0,
    industryLeadsCount: 0,
  }

  const handleCopyPitch = (prospect: B2BProspect) => {
    navigator.clipboard.writeText(prospect.customPitch)
    setCopiedId(prospect.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleOpenWhatsApp = (prospect: B2BProspect) => {
    if (!prospect.whatsapp) return
    const text = encodeURIComponent(prospect.customPitch)
    window.open(`https://wa.me/${prospect.whatsapp}?text=${text}`, '_blank')
  }

  const getSectorIcon = (sector: B2BProspect['sector']) => {
    switch (sector) {
      case 'SEGURIDAD_PRIVADA':
        return <Shield className="h-3.5 w-3.5 text-blue-600" />
      case 'TRANSPORTE_CARGA':
        return <Truck className="h-3.5 w-3.5 text-amber-600" />
      case 'INSTALADOR_TELECOM':
        return <Wrench className="h-3.5 w-3.5 text-purple-600" />
      case 'MINERIA_INDUSTRIA':
      case 'AGROINDUSTRIA':
      default:
        return <Building className="h-3.5 w-3.5 text-emerald-600" />
    }
  }

  const getSectorLabel = (sector: B2BProspect['sector']) => {
    switch (sector) {
      case 'SEGURIDAD_PRIVADA':
        return 'Seguridad Privada'
      case 'TRANSPORTE_CARGA':
        return 'Transporte / Flota'
      case 'INSTALADOR_TELECOM':
        return 'Instalador Telecom'
      case 'MINERIA_INDUSTRIA':
        return 'Minería & Canteras'
      case 'AGROINDUSTRIA':
      default:
        return 'Industria'
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 via-slate-50/40 to-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Motor de Prospección B2B Colombia
                </h3>
                <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase tracking-wide">
                  CLIENTES NUEVOS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Directorio calificado de empresas de Seguridad, Transporte e Instaladores listos para comprar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-1.5 border border-emerald-200/70 text-xs">
            <span className="text-slate-600 font-medium">Pipeline Mensual:</span>
            <span className="font-bold text-emerald-800">
              {formatCOP(summary.totalPipelineValueCOP)}/mes
            </span>
          </div>
        </div>

        {convertedMsg && (
          <div className="mt-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>{convertedMsg}</span>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Todos los Sectores' },
              { id: 'SEGURIDAD_PRIVADA', label: '🛡️ Seguridad Privada' },
              { id: 'TRANSPORTE_CARGA', label: '🚛 Transporte & Flotas' },
              { id: 'INSTALADOR_TELECOM', label: '🔧 Instaladores Telecom' },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSectorFilter(sec.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  sectorFilter === sec.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por empresa o ciudad..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Prospects List */}
      <div className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-xs font-medium text-slate-500">
            No hay prospectos bajo los filtros seleccionados.
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {leads.map((prospect) => (
              <div
                key={prospect.id}
                className="group flex flex-col gap-3 p-4 sm:px-5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {prospect.companyName}
                    </h4>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {getSectorIcon(prospect.sector)}
                      <span>{getSectorLabel(prospect.sector)}</span>
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 text-slate-400" /> {prospect.city}, {prospect.department}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-slate-500">
                    <span>
                      Contacto: <strong className="text-slate-700 font-semibold">{prospect.contactName}</strong> ({prospect.contactRole})
                    </span>
                    <span>
                      Radios Estimados: <strong className="text-slate-800">{prospect.estimatedRadiosCount}</strong>
                    </span>
                    <span>
                      Potencial: <strong className="text-emerald-700 font-bold">{formatCOP(prospect.monthlyPotentialCOP)}/mes</strong>
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-600 bg-slate-50/80 rounded-lg p-2 border border-slate-100 italic line-clamp-2">
                    "{prospect.customPitch}"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyPitch(prospect)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    title="Copiar mensaje personalizado"
                  >
                    {copiedId === prospect.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copiar Pitch</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenWhatsApp(prospect)}
                    disabled={!prospect.whatsapp}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-40"
                    title="Abrir chat de WhatsApp con el pitch listo"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => convertMutation.mutate(prospect.id)}
                    disabled={convertMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    title="Importar cliente a Maral OS y abrir Cotizador Flash"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{convertMutation.isPending ? 'Guardando...' : 'Convertir & Cotizar'}</span>
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
