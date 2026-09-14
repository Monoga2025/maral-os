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
    pill: 'bg-rose-100 text-rose-800 border border-rose-200',
    card: 'border-rose-100 bg-rose-50/60',
    dot:  'bg-rose-500',
    label: 'Urgente',
  },
  NORMAL: {
    pill: 'bg-blue-100 text-blue-800 border border-blue-200',
    card: 'border-blue-100 bg-blue-50/60',
    dot:  'bg-blue-500',
    label: 'Pendiente',
  },
  INFO: {
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
    card: 'border-slate-100 bg-slate-50/60',
    dot:  'bg-slate-400',
    label: 'Info',
  },
} as const

const MOOD_BAR = {
  BIEN:     { bg: 'bg-emerald-500', label: '✅ Negocio al día' },
  ATENCION: { bg: 'bg-amber-400',  label: '⚠️ Requiere atención' },
  CRITICO:  { bg: 'bg-rose-500',    label: '🚨 Acción urgente' },
} as const

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
    </span>
  )
}

function SkeletonRow({ w }: { w: string }) {
  return <div className={`h-12 rounded-xl bg-slate-100 animate-pulse ${w}`} />
}

export function DailyBriefing() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const query = useQuery<Briefing | null>({
    queryKey: ['ai-briefing'],
    queryFn: () => api.post<Briefing | null>('/ai/briefing', {}).then((r) => r.data),
    staleTime: 15 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  })

  const briefing = query.data ?? null
  const moodCfg = briefing ? MOOD_BAR[briefing.mood] : null
  const urgentes = briefing?.actions.filter(a => a.priority === 'URGENTE') ?? []
  const normales = briefing?.actions.filter(a => a.priority !== 'URGENTE') ?? []

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
          </div>
          <div className="leading-tight">
            <p className="text-white text-xs font-bold uppercase tracking-wide">Asistente Ejecutivo</p>
            {briefing && moodCfg && (
              <p className="text-slate-300 text-[11px] font-medium">{moodCfg.label}</p>
            )}
            {query.isFetching && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <PulseDot />
                <p className="text-slate-400 text-[11px]">Analizando indicadores...</p>
              </div>
            )}
          </div>
        </div>
        {briefing && (
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['ai-briefing'] })}
            disabled={query.isFetching}
            title="Actualizar análisis"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${query.isFetching ? 'animate-spin' : ''}`} />
            <span className="text-[11px]">{query.isFetching ? '' : 'Actualizar'}</span>
          </button>
        )}
      </div>

      {/* Mood progress bar */}
      {moodCfg && !query.isFetching && (
        <div className="h-0.5 w-full bg-slate-100">
          <div className={`h-full w-full ${moodCfg.bg} transition-all`} />
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Loading skeletons */}
        {query.isFetching && (
          <div className="space-y-2">
            <SkeletonRow w="w-full" />
            <SkeletonRow w="w-5/6" />
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
                  <p className={`text-xs font-semibold ${isQuota ? 'text-purple-800' : 'text-amber-800'}`}>
                    {isQuota ? 'Cuota de IA en pausa' : 'Asistente no disponible'}
                  </p>
                  {isQuota && <p className="text-[11px] text-purple-600 mt-0.5">Se restablece pronto</p>}
                </div>
              </div>
              {!isQuota && (
                <button
                  onClick={() => qc.invalidateQueries({ queryKey: ['ai-briefing'] })}
                  className="shrink-0 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Reintentar
                </button>
              )}
            </div>
          )
        })()}

        {/* Greeting */}
        {briefing && !query.isFetching && (
          <p className="text-xs font-semibold text-slate-800 px-0.5">{briefing.greeting}</p>
        )}

        {/* All good state */}
        {briefing && briefing.actions.length === 0 && !query.isFetching && (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-900">¡Todo al día!</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">No hay acciones urgentes pendientes.</p>
            </div>
          </div>
        )}

        {/* URGENTE actions */}
        {urgentes.length > 0 && !query.isFetching && (
          <div className="space-y-2">
            {urgentes.map((action, i) => {
              const cfg = PRIORITY_CONFIG[action.priority]
              return (
                <div key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${cfg.card}`}>
                  <span className="text-base shrink-0 leading-none">{action.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 font-semibold leading-snug">{action.text}</p>
                  </div>
                  <button
                    onClick={() => navigate(action.link)}
                    className="shrink-0 flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                  >
                    {action.cta} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* NORMAL actions */}
        {normales.length > 0 && !query.isFetching && (
          <div className="space-y-1.5">
            {normales.map((action, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                <span className="text-sm shrink-0 leading-none">{action.emoji}</span>
                <p className="flex-1 text-xs text-slate-700 font-medium leading-snug">{action.text}</p>
                <button
                  onClick={() => navigate(action.link)}
                  className="shrink-0 flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 text-[11px] font-bold hover:underline"
                >
                  {action.cta} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Insight */}
        {briefing?.insight && !query.isFetching && (
          <div className="flex items-start gap-2 px-3 py-2 bg-indigo-50/70 border border-indigo-100/80 rounded-xl">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">{briefing.insight}</p>
          </div>
        )}
      </div>
    </div>
  )
}
