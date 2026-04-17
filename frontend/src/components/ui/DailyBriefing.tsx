import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sparkles, RefreshCw, ChevronRight, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import api from '../../lib/api'

interface BriefingAction {
  priority: 'URGENTE' | 'NORMAL' | 'INFO'
  emoji: string
  text: string
  link: string
}

interface Briefing {
  greeting: string
  summary: string
  actions: BriefingAction[]
  insight?: string
  mood: 'BIEN' | 'ATENCION' | 'CRITICO'
}

const PRIORITY_STYLES: Record<BriefingAction['priority'], string> = {
  URGENTE: 'border-l-red-500 bg-red-50 hover:bg-red-100',
  NORMAL:  'border-l-blue-400 bg-blue-50 hover:bg-blue-100',
  INFO:    'border-l-gray-300 bg-gray-50 hover:bg-gray-100',
}

const MOOD_CONFIG: Record<Briefing['mood'], { icon: React.ReactNode; color: string; label: string }> = {
  BIEN:     { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600', label: 'Todo bien' },
  ATENCION: { icon: <Info className="h-4 w-4" />,         color: 'text-amber-500', label: 'Atención requerida' },
  CRITICO:  { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600',  label: 'Acción urgente' },
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-blue-400"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  )
}

export function DailyBriefing() {
  const navigate = useNavigate()
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loaded, setLoaded] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.post<Briefing>('/ai/briefing', {}).then((r) => r.data),
    onSuccess: (data) => {
      setBriefing(data)
      setLoaded(true)
    },
  })

  // Auto-load on first render
  if (!loaded && !mutation.isPending && !mutation.isError) {
    mutation.mutate()
  }

  const moodCfg = briefing ? MOOD_CONFIG[briefing.mood] : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Asistente MARAL</p>
            <p className="text-blue-200 text-xs">Análisis inteligente del día</p>
          </div>
        </div>
        {loaded && (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${mutation.isPending ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {mutation.isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <TypingDots />
              <p className="text-sm text-gray-400">Analizando el negocio...</p>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" style={{ width: `${70 + i * 10}%` }} />
              ))}
            </div>
          </div>
        )}

        {mutation.isError && !mutation.isPending && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">No se pudo conectar con el asistente</p>
              <button onClick={() => mutation.mutate()} className="text-xs text-amber-600 hover:underline mt-0.5">
                Intentar de nuevo
              </button>
            </div>
          </div>
        )}

        {briefing && !mutation.isPending && (
          <div className="space-y-4">
            {/* Greeting + mood */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900">{briefing.greeting}</p>
                <p className="text-sm text-gray-500 mt-0.5">{briefing.summary}</p>
              </div>
              {moodCfg && (
                <div className={`flex items-center gap-1.5 shrink-0 text-xs font-medium ${moodCfg.color}`}>
                  {moodCfg.icon}
                  <span>{moodCfg.label}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {briefing.actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Acciones recomendadas</p>
                {briefing.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(action.link)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 text-left transition-colors ${PRIORITY_STYLES[action.priority]}`}
                  >
                    <span className="text-lg shrink-0">{action.emoji}</span>
                    <span className="flex-1 text-sm text-gray-800 font-medium">{action.text}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Insight */}
            {briefing.insight && (
              <div className="flex items-start gap-2.5 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-700">{briefing.insight}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
