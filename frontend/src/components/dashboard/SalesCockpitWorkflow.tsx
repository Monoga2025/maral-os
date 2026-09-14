import React from 'react'
import { Zap, Target, MessageCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

interface SalesCockpitWorkflowProps {
  onOpenRadar: () => void
  onOpenQuickQuote: () => void
  onOpenWhatsApp?: () => void
}

export function SalesCockpitWorkflow({ onOpenRadar, onOpenQuickQuote, onOpenWhatsApp }: SalesCockpitWorkflowProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 text-white shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <Zap className="h-4 w-4 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Cockpit de Ventas 1-Click (Flujo Automatizado)
              </h3>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                IA ACTIVA
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              3 pasos directos para generar ingresos en minutos sin perderte en menús
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Automatización comercial Maral OS</span>
        </div>
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-3">
        {/* Step 1 */}
        <div
          onClick={onOpenRadar}
          className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 hover:border-amber-400/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-black text-amber-300 border border-amber-500/40">
              1
            </span>
            <span className="text-[10px] font-semibold text-slate-400 group-hover:text-amber-300 flex items-center gap-1 transition-colors">
              Paso 1 <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <h4 className="mt-2 text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
            🎯 1. Prospectar en Radar
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-300 leading-tight">
            Identifica clientes listos para recompra con speech sugerido.
          </p>
        </div>

        {/* Step 2 */}
        <div
          onClick={onOpenQuickQuote}
          className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 hover:border-blue-400/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-black text-blue-300 border border-blue-500/40">
              2
            </span>
            <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-300 flex items-center gap-1 transition-colors">
              Paso 2 <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <h4 className="mt-2 text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
            ⚡ 2. Cotizar Flash (30s)
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-300 leading-tight">
            Genera la cotización oficial con IVA (19%) y PDF al instante.
          </p>
        </div>

        {/* Step 3 */}
        <div
          onClick={onOpenRadar}
          className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 hover:border-emerald-400/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-300 border border-emerald-500/40">
              3
            </span>
            <span className="text-[10px] font-semibold text-slate-400 group-hover:text-emerald-300 flex items-center gap-1 transition-colors">
              Paso 3 <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <h4 className="mt-2 text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
            💬 3. Cerrar por WhatsApp
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-300 leading-tight">
            Envía el mensaje de cierre con 1 click y confirma el pedido.
          </p>
        </div>
      </div>
    </div>
  )
}
