import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, Thermometer, Snowflake, Ban, MessageSquare, FileText, CheckCircle, RefreshCw, Filter } from 'lucide-react'
import { notificationsApi } from '../lib/api'
import type { CampaignLead } from '../types'

const COLUMNS = [
  { key: 'HOT',    label: 'Calientes',  icon: <Flame className="h-4 w-4" />,        color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'   },
  { key: 'WARM',   label: 'Tibios',     icon: <Thermometer className="h-4 w-4" />,  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'COLD',   label: 'Fríos',      icon: <Snowflake className="h-4 w-4" />,    color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  { key: 'OPTOUT', label: 'Opt-out',    icon: <Ban className="h-4 w-4" />,           color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200'   },
] as const

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function LiveTick({ date }: { date?: string }) {
  const [ago, setAgo] = useState(timeAgo(date))
  useEffect(() => {
    const id = setInterval(() => setAgo(timeAgo(date)), 30_000)
    return () => clearInterval(id)
  }, [date])
  return <span>{ago}</span>
}

function LeadCard({ lead, onAttended }: { lead: CampaignLead; onAttended: () => void }) {
  const navigate = useNavigate()
  const isHot = lead.temperature === 'HOT'

  return (
    <div className={`bg-white rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow ${isHot ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {lead.client.company ?? lead.client.name}
          </p>
          {lead.client.company && (
            <p className="text-[11px] text-gray-500 truncate">{lead.client.name}</p>
          )}
        </div>
        {lead.repliedAt && (
          <span className={`text-[10px] shrink-0 font-medium px-1.5 py-0.5 rounded-full ${isHot ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
            <LiveTick date={lead.repliedAt} />
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-400 mb-2 truncate">
        📣 {lead.campaign.name}
        {lead.client.city && ` • ${lead.client.city}`}
      </p>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => navigate(`/whatsapp?jid=${lead.client.whatsapp ?? lead.client.phone ?? ''}`)}
          className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-200 rounded-lg px-2 py-1 hover:bg-green-100 transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          Abrir chat
        </button>

        <button
          onClick={() => navigate(`/cotizaciones/nueva?clientId=${lead.client.id}&campaignId=${lead.campaignId}`)}
          className="flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100 transition-colors"
        >
          <FileText className="h-3 w-3" />
          Cotizar
        </button>

        {!lead.convertedAt && (
          <button
            onClick={onAttended}
            className="flex items-center gap-1 text-[11px] bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
          >
            <CheckCircle className="h-3 w-3" />
            Atendido
          </button>
        )}

        {lead.convertedAt && (
          <span className="flex items-center gap-1 text-[11px] text-green-600">
            <CheckCircle className="h-3 w-3" />
            Atendido
          </span>
        )}
      </div>
    </div>
  )
}

export default function CampaignLeads() {
  const [filterCampaign, setFilterCampaign] = useState('')
  const [onlyUnattended, setOnlyUnattended] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaign-leads', filterCampaign],
    queryFn: () =>
      notificationsApi.getLeads(filterCampaign ? { campaignId: filterCampaign } : {}).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const attendMut = useMutation({
    mutationFn: (recipientId: string) => notificationsApi.markAttended(recipientId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-leads'] }),
  })

  const filterLead = (lead: CampaignLead) => {
    if (onlyUnattended && lead.convertedAt) return false
    return true
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            Leads de campaña
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Respuestas clasificadas por temperatura</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUnattended}
              onChange={(e) => setOnlyUnattended(e.target.checked)}
              className="rounded"
            />
            Solo sin atender
          </label>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Totals bar */}
      {data && (
        <div className="flex gap-3 mb-6">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`flex items-center gap-2 ${col.bg} border ${col.border} rounded-xl px-4 py-2`}>
              <span className={col.color}>{col.icon}</span>
              <span className={`text-sm font-semibold ${col.color}`}>{data.totals[col.key] ?? 0}</span>
              <span className="text-xs text-gray-500">{col.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar por campaña ID"
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
              {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const leads = (data?.[col.key as keyof typeof data] as CampaignLead[] | undefined ?? []).filter(filterLead)
            return (
              <div key={col.key}>
                <div className={`flex items-center gap-2 ${col.bg} border ${col.border} rounded-xl px-3 py-2 mb-3`}>
                  <span className={col.color}>{col.icon}</span>
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  <span className="ml-auto text-xs text-gray-400">{leads.length}</span>
                </div>
                <div className="space-y-2">
                  {leads.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Sin leads</p>
                  ) : (
                    leads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onAttended={() => attendMut.mutate(lead.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
