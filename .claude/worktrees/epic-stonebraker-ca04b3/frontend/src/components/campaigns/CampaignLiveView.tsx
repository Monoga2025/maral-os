import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pause, Play, XCircle, Clock, CheckCircle, MessageSquare, Send } from 'lucide-react'
import { campaignsApi } from '../../lib/api'
import type { CampaignStatus } from '../../types'

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  READ: 'bg-teal-100 text-teal-700',
  REPLIED: 'bg-purple-100 text-purple-700',
  CONVERTED: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
  EXCLUDED: 'bg-gray-100 text-gray-400',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  SCHEDULED: 'Programado',
  SENT: 'Enviado',
  DELIVERED: 'Entregado',
  READ: 'Leído',
  REPLIED: 'Respondió',
  CONVERTED: 'Convertido',
  FAILED: 'Fallido',
  EXCLUDED: 'Excluido',
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

export default function CampaignLiveView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-live', id],
    queryFn: () => campaignsApi.live(id!).then((r) => r.data),
    refetchInterval: 3000,
    enabled: !!id,
  })

  const pauseMutation = useMutation({
    mutationFn: () => campaignsApi.pause(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-live', id] }),
  })

  const resumeMutation = useMutation({
    mutationFn: () => campaignsApi.resume(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-live', id] }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => campaignsApi.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-live', id] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando…</div>
  }
  if (!data) return null

  const { campaign, metrics, countsByStatus, recentRecipients } = data
  const m = metrics ?? { sent: 0, delivered: 0, read: 0, replied: 0, converted: 0 }

  const totalRecipients = (countsByStatus ?? []).reduce((acc, g) => acc + (g._count ?? 0), 0)
  const sentCount = m.sent ?? 0
  const progress = totalRecipients > 0 ? Math.round((sentCount / totalRecipients) * 100) : 0

  const isActive = campaign.status === 'EN_CURSO'
  const isPaused = campaign.status === 'PAUSADA'
  const isFinished = ['COMPLETADA', 'CANCELADA'].includes(campaign.status as CampaignStatus)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/campanas')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900" data-tour="live-title">{campaign.name}</h1>
          <p className="text-sm text-gray-500">
            {campaign.startedAt
              ? `Iniciada ${new Date(campaign.startedAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}`
              : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="flex items-center gap-2 bg-orange-100 text-orange-700 hover:bg-orange-200 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Pause className="h-4 w-4" />
              Pausar
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Play className="h-4 w-4" />
              Reanudar
            </button>
          )}
          {!isFinished && (
            <button
              onClick={() => {
                if (confirm('¿Cancelar la campaña? Se detendrán todos los envíos pendientes.')) {
                  cancelMutation.mutate()
                }
              }}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <XCircle className="h-4 w-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-5 flex items-center gap-3">
        {isActive && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">En curso</span>
          </div>
        )}
        {isPaused && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
            <Pause className="h-3 w-3 text-orange-600" />
            <span className="text-xs font-medium text-orange-700">Pausada</span>
          </div>
        )}
        {campaign.status === 'COMPLETADA' && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <CheckCircle className="h-3 w-3 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Completada</span>
          </div>
        )}
        {campaign.status === 'CANCELADA' && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-3 py-1">
            <XCircle className="h-3 w-3 text-red-600" />
            <span className="text-xs font-medium text-red-700">Cancelada</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6" data-tour="live-progress">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{sentCount} enviados de {totalRecipients} destinatarios</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6" data-tour="live-metrics">
        <MetricCard label="Enviados" value={m.sent} icon={<Send className="h-5 w-5 opacity-60" />} color="bg-green-50 text-green-800" />
        <MetricCard label="Entregados" value={m.delivered} icon={<CheckCircle className="h-5 w-5 opacity-60" />} color="bg-blue-50 text-blue-800" />
        <MetricCard label="Leídos" value={m.read} icon={<Clock className="h-5 w-5 opacity-60" />} color="bg-purple-50 text-purple-800" />
        <MetricCard label="Respondieron" value={m.replied} icon={<MessageSquare className="h-5 w-5 opacity-60" />} color="bg-yellow-50 text-yellow-800" />
      </div>

      {/* Status breakdown */}
      {countsByStatus && countsByStatus.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {countsByStatus.map((g) => (
            <div key={g.status} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[g.status] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[g.status] || g.status}
              </span>
              <span className="text-sm font-semibold text-gray-700">{g._count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent recipients table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-tour="live-table">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Últimos 20 envíos</h2>
        </div>
        {!recentRecipients || recentRecipients.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Aún no hay envíos</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Paso</th>
                <th className="px-4 py-2 text-left">Enviado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentRecipients.map((r) => (
                <tr key={r?.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{r?.client?.name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[r?.status ?? ''] || 'bg-gray-100'}`}>
                      {STATUS_LABEL[r?.status ?? ''] || r?.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">Paso {(r?.currentStep ?? 0) + 1}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {r?.sentAt
                      ? new Date(r.sentAt).toLocaleString('es-CO', { timeStyle: 'short', dateStyle: 'short' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
