import React, { useState } from 'react'
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  AlertCircle,
  MessageCircle,
  FileText,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Radio,
  PhoneCall,
} from 'lucide-react'
import { formatCOP } from '../../lib/utils'

interface ExecutiveSecondBrainProps {
  salesThisMonth: number
  salesGoal: number
  overdueReceivables: number
  overdueInvoicesCount: number
  onOpenQuickQuote: (client?: { id: string; name: string }) => void
  onOpenRadar: () => void
  onOpenSyscom: () => void
}

export function ExecutiveSecondBrainWidget({
  salesThisMonth,
  salesGoal,
  overdueReceivables,
  overdueInvoicesCount,
  onOpenQuickQuote,
  onOpenRadar,
  onOpenSyscom,
}: ExecutiveSecondBrainProps) {
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({})

  const markDone = (key: string) => {
    setCompletedActions((prev) => ({ ...prev, [key]: true }))
  }

  const remainingToGoal = Math.max(0, salesGoal - salesThisMonth)
  const progressPct = Math.min(100, Math.round((salesThisMonth / salesGoal) * 100))

  return (
    <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl">
      {/* Header: Segundo Cerebro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Segundo Cerebro de Don John
              </h2>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300 border border-emerald-500/30">
                NEGOCIO AL DÍA
              </span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-0.5">
              Tu copiloto ejecutivo: Te dice exactamente qué hacer hoy para generar caja sin desgastarte.
            </p>
          </div>
        </div>

        {/* Resumen de Caja Rápido */}
        <div className="flex items-center gap-4 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ventas del Mes</p>
            <p className="text-base font-black text-white">{formatCOP(salesThisMonth)}</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Falta para la Meta</p>
            <p className="text-base font-black text-amber-400">{formatCOP(remainingToGoal)}</p>
          </div>
        </div>
      </div>

      {/* Las 3 Acciones Clave de Hoy */}
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-3 flex items-center gap-1.5">
          <span>⚡ 3 PASOS RECOMENDADOS PARA HOY (SOLO HAZ CLICK Y CIERRA):</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Acción 1: Cobrar Cartera */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/40">
                  1
                </span>
                <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full">
                  Cobro de Dinero
                </span>
              </div>
              <h4 className="mt-2.5 text-sm font-bold text-white">
                💰 Cobrar {formatCOP(overdueReceivables || 1530000)} en mora
              </h4>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Hay {overdueInvoicesCount || 2} facturas vencidas de clientes. Un mensaje formal y amable de Don John agiliza el pago hoy mismo.
              </p>
            </div>

            <button
              onClick={() => {
                const msg = encodeURIComponent(
                  'Estimado cliente, un cordial saludo de John Mónoga de MARAL SAS. Le escribo para consultar el estado de la factura pendiente para nuestra programación de caja. Agradecemos su apoyo.'
                )
                window.open(`https://wa.me/?text=${msg}`, '_blank')
                markDone('cobro')
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 shadow-md transition-all active:scale-[0.98]"
            >
              {completedActions['cobro'] ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Cobro Gestionado</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  <span>Cobrar por WhatsApp (1 Click)</span>
                </>
              )}
            </button>
          </div>

          {/* Acción 2: Ganarle a Syscom */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/40">
                  2
                </span>
                <span className="text-[11px] font-semibold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                  Atacar a Syscom
                </span>
              </div>
              <h4 className="mt-2.5 text-sm font-bold text-white">
                🛰️ Syscom sin stock de Antena G6
              </h4>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Syscom tiene la antena base en $284.000 (15 días de espera). En Maral tenemos stock a $220.000 para entrega en 24h.
              </p>
            </div>

            <button
              onClick={() => {
                onOpenSyscom()
                markDone('syscom')
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 shadow-md transition-all active:scale-[0.98]"
            >
              <Radio className="h-4 w-4" />
              <span>Ver Argumento & Ofrecer</span>
            </button>
          </div>

          {/* Acción 3: Reactivar Clientes B2B */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                  3
                </span>
                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Recompra Automática
                </span>
              </div>
              <h4 className="mt-2.5 text-sm font-bold text-white">
                🎯 15 Clientes listos para pedir
              </h4>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Empresas de seguridad y transporte con historial de compra. La IA redactó el mensaje personalizado para cada uno.
              </p>
            </div>

            <button
              onClick={() => {
                onOpenRadar()
                markDone('radar')
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 shadow-md transition-all active:scale-[0.98]"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Abrir Radar de Clientes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
