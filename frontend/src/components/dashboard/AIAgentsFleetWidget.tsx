import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Zap,
  MessageSquare,
  Flame,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Send,
  Radio,
} from 'lucide-react'

interface AIAgentsFleetWidgetProps {
  onOpenRadar?: () => void
  onOpenQuickQuote?: () => void
}

export function AIAgentsFleetWidget({ onOpenRadar, onOpenQuickQuote }: AIAgentsFleetWidgetProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Flota de Agentes IA de Maral
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                24/7 ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Haz clic en cualquier agente para ver su trabajo o ejecutarlo
            </p>
          </div>
        </div>
      </div>

      {/* Agents Grid (4 Interactive Agents) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 pt-3">
        {/* Agent 1: Prospección B2B */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Flame className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9px] font-extrabold uppercase text-amber-800 bg-amber-100/70 border border-amber-200/60 px-2 py-0.5 rounded">
                B2B Lead Hunter
              </span>
            </div>
            <h5 className="mt-2 font-bold text-slate-900 text-xs">
              Agente Prospección B2B
            </h5>
            <p className="mt-0.5 text-[11px] text-slate-600 leading-tight">
              Extrae empresas de seguridad y transporte listas para comprar.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> 15 Calificados
            </span>
            <button
              onClick={() => {
                if (onOpenRadar) onOpenRadar()
                else navigate('/clientes')
              }}
              className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-950 hover:underline text-[11px]"
            >
              <span>Ver Prospectos</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Agent 2: Vendedor WhatsApp */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9px] font-extrabold uppercase text-emerald-800 bg-emerald-100/70 border border-emerald-200/60 px-2 py-0.5 rounded">
                WhatsApp 24/7
              </span>
            </div>
            <h5 className="mt-2 font-bold text-slate-900 text-xs">
              Vendedor WhatsApp Assist
            </h5>
            <p className="mt-0.5 text-[11px] text-slate-600 leading-tight">
              Atiende consultas técnicas, redacta pitches y cotiza.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <Send className="h-3 w-3" /> 1-Click WPP
            </span>
            <button
              onClick={() => navigate('/whatsapp')}
              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 hover:underline text-[11px]"
            >
              <span>Abrir WhatsApp</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Agent 3: Cotizador Flash (30s) */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9px] font-extrabold uppercase text-blue-800 bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded">
                Cotizador Flash
              </span>
            </div>
            <h5 className="mt-2 font-bold text-slate-900 text-xs">
              Cotizador en 30 Segundos
            </h5>
            <p className="mt-0.5 text-[11px] text-slate-600 leading-tight">
              Genera PDFs oficiales con IVA (19%) y botón de envío.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
            <span className="font-semibold text-blue-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Auto-IVA
            </span>
            <button
              onClick={onOpenQuickQuote}
              className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-950 hover:underline text-[11px]"
            >
              <span>Cotizar Ya ⚡</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Agent 4: Radar de Precios & Arbitraje Syscom */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 hover:bg-white hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <Radio className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9px] font-extrabold uppercase text-purple-800 bg-purple-100/70 border border-purple-200/60 px-2 py-0.5 rounded">
                Radar Syscom
              </span>
            </div>
            <h5 className="mt-2 font-bold text-slate-900 text-xs">
              Espía de Precios Syscom
            </h5>
            <p className="mt-0.5 text-[11px] text-slate-600 leading-tight">
              Monitorea quiebres de stock y mantiene ventaja en Dipolos.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
            <span className="font-semibold text-purple-700 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Dipolos #1
            </span>
            <button
              onClick={() => {
                if (onOpenRadar) onOpenRadar()
                else navigate('/catalogo')
              }}
              className="inline-flex items-center gap-1 font-bold text-purple-800 hover:text-purple-950 hover:underline text-[11px]"
            >
              <span>Ver Radar</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
