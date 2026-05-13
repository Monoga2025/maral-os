import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight, Zap } from 'lucide-react'
import api from '../../lib/api'
import axios from 'axios'

interface BriefingAction {
  priority: 'URGENTE' | 'NORMAL' | 'INFO'
  emoji: string
  text: string
  link: string
  cta: string
}

interface Briefing {
  greeting: string
  actions: BriefingAction[]
  insight?: string
  mood: 'BIEN' | 'ATENCION' | 'CRITICO'
}

const PRIORITY_CONFIG = {
  URGENTE: {
    pill: 'bg-red-100 text-red-700 border border-red-200',
    card: 'border-red-100 bg-red-50/40',
    dot:  'bg-red-500',
    label: 'Urgente',
  },
  NORMAL: {
    pill: 'bg-blue-100 text-blue-700 border border-blue-200',
    card: 'border-blue-100 bg-blue-50/40',
    dot:  'bg-blue-400',
    label: 'Pendiente',
  },
  INFO: {
    pill: 'bg-gray-100 text-gray-600 border border-gray-200',
    card: 'border-gray-100 bg-gray-50/40',
    dot:  'bg-gray-300',
    label: 'Info',
  },
} as const

const MOOD_BAR = {
  BIEN:     { bg: 'bg-green-500',  label: '✅ Negocio al día' },
  ATENCION: { bg: 'bg-amber-400',  label: '⚠️ Requiere atención' },
  CRITICO:  { bg: 'bg-red-500',    label: '🚨 Acción urgente' },
} as const

function PulseDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
    </span>
  )
}

function SkeletonRow({ w }: { w: string }) {
  return <div className={`h-14 rounded-xl bg-gray-100 animate-pulse ${w}`} />
}

export function DailyBriefing() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const query = useQuery<Briefing | null>({
    queryKey: ['ai-briefing'],
    queryFn: () => api.post<Briefing | null>('/ai/briefing', {}).then((r) => r.data),
    staleTime: 15 * 60 * 1000,   // no re-fetch por 15 min aunque navegues
    gcTime:    30 * 60 * 1000,   // mantiene en caché 30 min
    retry: 2,
    refetchOnWindowFocus: false,
  })

  const briefing = query.data ?? null
  const moodCfg = briefing ? MOOD_BAR[briefing.mood] : null
  const urgentes = briefing?.actions.filter(a => a.priority === 'URGENTE') ?? []
  const normales = briefing?.actions.filter(a => a.priority !== 'URGENTE') ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-white text-sm font-semibold">Asistente MARAL</p>
            {briefing && moodCfg && (
              <p className="text-slate-300 text-[11px]">{moodCfg.label}</p>
            )}
            {query.isFetching && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <PulseDot />
                <p className="text-slate-400 text-[11px]">Analizando el negocio...</p>
              </div>
            )}
          </div>
        </div>
        {briefing && (
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['ai-briefing'] })}
            disabled={query.isFetching}
            title="Actualizar análisis"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
            {!query.isFetching && 'Actualizar'}
          </button>
        )}
      </div>

      {/* Mood progress bar */}
      {moodCfg && !query.isFetching && (
        <div className="h-0.5 w-full bg-gray-100">
          <div className={`h-full w-full ${moodCfg.bg} transition-all`} />
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">

        {/* Loading skeletons */}
        {query.isFetching && (
          <div className="space-y-2.5">
            <SkeletonRow w="w-full" />
            <SkeletonRow w="w-5/6" />
            <SkeletonRow w="w-4/5" />
          </div>
        )}

        {/* Error */}
        {query.isError && !query.isFetching && (() => {
          const errMsg = axios.isAxiosError(query.error)
            ? (query.error.response?.data as { error?: string })?.error
            : ''
          const isQuota = errMsg === 'QUOTA_EXCEEDED'
          return (
            <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${isQuota ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2">
                {isQuota
                  ? <Zap className="h-4 w-4 text-purple-500 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                <div>
                  <p className={`text-sm font-medium ${isQuota ? 'text-purple-800' : 'text-amber-800'}`}>
                    {isQuota ? 'Cuota de IA agotada por hoy' : 'No se pudo conectar con el asistente'}
                  </p>
                  {isQuota && <p className="text-xs text-purple-600 mt-0.5">Se restablece mañana — o actualiza la clave en Google AI Studio</p>}
                </div>
              </div>
              {!isQuota && (
                <button
                  onClick={() => qc.invalidateQueries({ queryKey: ['ai-briefing'] })}
                  className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Reintentar
                </button>
              )}
            </div>
          )
        })()}

        {/* Greeting */}
        {briefing && !query.isFetching && (
          <p className="text-sm font-medium text-gray-700 px-0.5">{briefing.greeting}</p>
        )}

        {/* All good state */}
        {briefing && briefing.actions.length === 0 && !query.isFetching && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">¡Todo al día!</p>
              <p className="text-xs text-green-600 mt-0.5">No hay acciones urgentes hoy. Buen trabajo.</p>
            </div>
          </div>
        )}

        {/* URGENTE actions */}
        {urgentes.length > 0 && !query.isFetching && (
          <div className="space-y-2">
            {urgentes.map((action, i) => {
              const cfg = PRIORITY_CONFIG[action.priority]
              return (
                <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${cfg.card}`}>
                  <span className="text-xl shrink-0 leading-none">{action.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium leading-snug">{action.text}</p>
                  </div>
                  <button
                    onClick={() => navigate(action.link)}
                    className="shrink-0 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {action.cta} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* NORMAL / INFO actions */}
        {normales.length > 0 && !query.isFetching && (
          <div className="space-y-1.5">
            {normales.map((action, i) => {
              const cfg = PRIORITY_CONFIG[action.priority]
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                  <span className="text-base shrink-0 leading-none">{action.emoji}</span>
                  <p className="flex-1 text-sm text-gray-700 leading-snug">{action.text}</p>
                  <button
                    onClick={() => navigate(action.link)}
                    className="shrink-0 flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {action.cta} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Insight */}
        {briefing?.insight && !query.isFetching && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 leading-relaxed">{briefing.insight}</p>
          </div>
        )}
      </div>
    </div>
  )
}
