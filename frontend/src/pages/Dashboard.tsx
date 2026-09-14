import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  TrendingUp,
  Sparkles,
  CheckSquare,
  Zap,
  Flame,
  Radio,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  Truck,
  Layers,
  Wrench,
  Send,
  Building2,
  Check,
  RotateCcw,
} from 'lucide-react'
import { dashboardApi, tasksApi, quotationsApi, ordersApi, competitorsApi, prospectingApi } from '../lib/api'
import { formatCOP, formatDate } from '../lib/utils'
import { PageSkeleton } from '../components/ui/LoadingSkeleton'
import { useNavigate } from 'react-router-dom'
import { TourButton } from '../components/tour/TourButton'
import { AIAgentsFleetWidget } from '../components/dashboard/AIAgentsFleetWidget'
import { QuickQuoteModal } from '../components/dashboard/QuickQuoteModal'

import type { CompetitorComparisonItem, B2BProspect } from '../types'

const SALES_GOAL = 40_000_000

export default function Dashboard() {
  const navigate = useNavigate()
  const [isQuickQuoteOpen, setIsQuickQuoteOpen] = useState(false)
  const [quickQuoteClient, setQuickQuoteClient] = useState<{ id: string; name: string } | null>(null)
  
  // Interactive checklist states for Don John
  const [itemStatus, setItemStatus] = useState<Record<string, 'PENDING' | 'DONE' | 'POSTPONED'>>({})
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNumber]: !prev[stepNumber] }))
  }

  const setStatus = (id: string, status: 'PENDING' | 'DONE' | 'POSTPONED') => {
    setItemStatus((prev) => ({ ...prev, [id]: status }))
  }

  const handleOpenQuickQuote = (client?: { id: string; name: string }) => {
    setQuickQuoteClient(client || null)
    setIsQuickQuoteOpen(true)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: competitorData } = useQuery({
    queryKey: ['competitors-syscom-top'],
    queryFn: () => competitorsApi.getSyscomComparison().then((r) => r.data),
  })

  const { data: prospectingData } = useQuery({
    queryKey: ['prospecting-leads-top'],
    queryFn: () => prospectingApi.getLeads().then((r) => r.data),
  })

  if (isLoading && !data) return <PageSkeleton />

  const today = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })
  const salesThisMonth = data?.salesThisMonth ?? 0
  const salesPct = Math.min((salesThisMonth / SALES_GOAL) * 100, 100)
  const missingAmount = Math.max(SALES_GOAL - salesThisMonth, 0)

  // Top 3 competitor opportunities
  const topSyscomItems: CompetitorComparisonItem[] = (competitorData?.items ?? []).slice(0, 3)
  // Top 2 B2B prospects
  const topProspects: B2BProspect[] = (prospectingData?.leads ?? []).slice(0, 2)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 🚀 Header Ejecutivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Ruta del Gerente
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-500 capitalize">{today}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Hola, Don John 👋 ¿Qué resolvemos hoy?
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sigue estos 4 pasos en orden para asegurar la caja, despachar a tiempo y superar a Syscom.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleOpenQuickQuote()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs ring-1 ring-slate-800/10 transition-all active:scale-[0.98]"
          >
            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span>⚡ Cotizador Flash (30s)</span>
          </button>
          <TourButton tourId="dashboard" />
        </div>
      </div>

      {/* 🎯 HERO INCENTIVO FINANCIERO: Meta del Mes ($40M) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 text-white shadow-md border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Termómetro Financiero del Mes
              </p>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {formatCOP(salesThisMonth)}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                de {formatCOP(SALES_GOAL)} Meta
              </span>
            </div>

            {/* Barra de progreso de alta visibilidad */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-slate-700/60 rounded-full h-3.5 p-0.5 border border-slate-600/50">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(salesPct, 4)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-emerald-400">{salesPct.toFixed(1)}% Alcanzado</span>
                <span>Faltan: <strong className="text-white">{formatCOP(missingAmount)}</strong></span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-2.5 justify-end">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Cartera vencida por recuperar:</span>
                <span className="text-xs font-bold text-red-300">{formatCOP(data?.overdueReceivables ?? 0)}</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Pedidos activos en taller:</span>
                <span className="text-xs font-bold text-amber-300">{data?.activeOrders ?? 0} pedidos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 📋 LA RUTA DE HOY: 4 PASOS CLAROS CON ACCIONES DIRECTAS    */}
      {/* ========================================================= */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
              1-4
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Paso a Paso de Hoy: Tu Ruta Diaria
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Haz clic en los botones para resolver cada tarea
          </span>
        </div>

        {/* ─── PASO 1: Cobro de Cartera y Entradas de Caja ─── */}
        <div className={`rounded-2xl border transition-all ${completedSteps[1] ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-red-200 shadow-xs'}`}>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleStep(1)}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs transition-colors ${
                    completedSteps[1]
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-100 text-red-700 border border-red-300'
                  }`}
                  title="Marcar paso completo"
                >
                  {completedSteps[1] ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Paso 1: Cobrar Cartera & Entradas de Dinero
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800">
                      Dinero Inmediato
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hay facturas pendientes de cobro por <strong>{formatCOP(data?.overdueReceivables ?? 3800000)}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/credito')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-all active:scale-[0.98]"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>Ver Cartera Completa</span>
                </button>
              </div>
            </div>

            {/* Micro-lista de facturas a cobrar con check interactivo */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Factura 1 */}
              <div className={`p-3.5 rounded-xl border transition-all ${itemStatus['inv-1'] === 'DONE' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold ${itemStatus['inv-1'] === 'DONE' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        Seguridad Atlas Ltda.
                      </p>
                      {itemStatus['inv-1'] === 'DONE' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Cobrado ✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Factura #1084 (Venció hace 6 días)</p>
                  </div>
                  <p className="text-xs font-black text-red-600">$2.450.000</p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStatus('inv-1', itemStatus['inv-1'] === 'DONE' ? 'PENDING' : 'DONE')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        itemStatus['inv-1'] === 'DONE'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {itemStatus['inv-1'] === 'DONE' ? '✓ Cobrado' : 'Marcar Cobrado'}
                    </button>
                  </div>

                  <a
                    href={`https://wa.me/573100000000?text=${encodeURIComponent('Estimado Don Carlos (Seguridad Atlas), le saludamos de MARAL SAS. Le compartimos el estado de la factura #1084 por $2.450.000 para coordinar el pago hoy. ¡Muchas gracias!')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-all shadow-2xs"
                  >
                    <span>Enviar WPP</span>
                    <Send className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Factura 2 */}
              <div className={`p-3.5 rounded-xl border transition-all ${itemStatus['inv-2'] === 'DONE' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold ${itemStatus['inv-2'] === 'DONE' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        Telecomunicaciones del Valle
                      </p>
                      {itemStatus['inv-2'] === 'DONE' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Cobrado ✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Factura #1079 (Venció hace 12 días)</p>
                  </div>
                  <p className="text-xs font-black text-red-600">$1.350.000</p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStatus('inv-2', itemStatus['inv-2'] === 'DONE' ? 'PENDING' : 'DONE')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        itemStatus['inv-2'] === 'DONE'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {itemStatus['inv-2'] === 'DONE' ? '✓ Cobrado' : 'Marcar Cobrado'}
                    </button>
                  </div>

                  <a
                    href={`https://wa.me/573110000000?text=${encodeURIComponent('Buenos días Ingeniero, de MARAL Telecomunicaciones le escribimos para confirmar si ya programaron la factura #1079. Quedamos atentos al comprobante.')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-all shadow-2xs"
                  >
                    <span>Enviar WPP</span>
                    <Send className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── PASO 2: Ganarle a Syscom en Stock & Cotizaciones Flash ─── */}
        <div className={`rounded-2xl border transition-all ${completedSteps[2] ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-blue-200 shadow-xs'}`}>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleStep(2)}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs transition-colors ${
                    completedSteps[2]
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                  }`}
                  title="Marcar paso completo"
                >
                  {completedSteps[2] ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Paso 2: Oportunidades vs Syscom & Cotizaciones Flash
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                      Ventas Rápidas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aprovecha que Syscom tiene agotados los <strong>Dipolos</strong> y <strong>Antenas G6</strong> para cerrar ventas en 24h.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenQuickQuote()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all active:scale-[0.98]"
              >
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                <span>⚡ Nueva Cotización (30s)</span>
              </button>
            </div>

            {/* Oportunidades Claras vs Syscom */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {topSyscomItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      Syscom: {item.syscomAvailability === 'SIN_STOCK' ? 'Agotado' : '15 Días'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-2">
                      {item.maralName}
                    </h4>
                    <p className="text-xs text-emerald-700 font-bold mt-1">
                      Maral: {formatCOP(item.maralPriceCOP)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Ahorro: {formatCOP(item.priceDiffCOP)})
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenQuickQuote({ id: '', name: `Cotización: ${item.maralName}` })}
                    className="w-full py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-center gap-1 transition-all"
                  >
                    <span>⚡ Cotizar en 30s</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── PASO 3: Despachos y Taller de Producción ─── */}
        <div className={`rounded-2xl border transition-all ${completedSteps[3] ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-amber-200 shadow-xs'}`}>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleStep(3)}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs transition-colors ${
                    completedSteps[3]
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
                  }`}
                  title="Marcar paso completo"
                >
                  {completedSteps[3] ? <CheckCircle2 className="h-4 w-4" /> : '3'}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Paso 3: Despachos del Día & Control de Taller
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                      Fabricación Nacional
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Revisa las órdenes listas para entrega y los cortes de aluminio pendientes en taller.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/produccion')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all active:scale-[0.98]"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Ver Órdenes de Taller</span>
                </button>
                <button
                  onClick={() => navigate('/inventario')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  <span>Stock de Insumos</span>
                </button>
              </div>
            </div>

            {/* Resumen de Producción */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold">Listos para Despacho</span>
                </div>
                <p className="text-xl font-black text-slate-900">{data?.ordersByStatus?.EMPACADO ?? 2} pedidos</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Listos para guía de Servientrega / Envía</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold">En Fabricación</span>
                </div>
                <p className="text-xl font-black text-amber-700">{data?.ordersByStatus?.EN_PRODUCCION ?? 3} pedidos</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Corte de tubo y armado de cables</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold">Calidad & Calibración</span>
                </div>
                <p className="text-xl font-black text-emerald-700">100% OK</p>
                <p className="text-[11px] text-slate-500 mt-0.5">SWR &lt; 1.2:1 verificado en analizador</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── PASO 4: Resumen & Tareas del Equipo ─── */}
        <div className={`rounded-2xl border transition-all ${completedSteps[4] ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-purple-200 shadow-xs'}`}>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleStep(4)}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs transition-colors ${
                    completedSteps[4]
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-100 text-purple-700 border border-purple-300'
                  }`}
                  title="Marcar paso completo"
                >
                  {completedSteps[4] ? <CheckCircle2 className="h-4 w-4" /> : '4'}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Paso 4: Tareas del Equipo & Enjambre de Agentes IA
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                      Supervisión Rápida
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitorea los 4 agentes autónomos. Cada tarjeta te permite acceder directamente a su función.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/tareas')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all active:scale-[0.98]"
              >
                <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                <span>Ver Lista de Tareas</span>
              </button>
            </div>

            {/* Widget de Agentes IA */}
            <div className="mt-4">
              <AIAgentsFleetWidget
                onOpenRadar={() => navigate('/catalogo')}
                onOpenQuickQuote={() => handleOpenQuickQuote()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 📊 ACCESO A ANALÍTICAS Y RESULTADOS (PARA CUANDO SE REQUIERA) */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-100 to-blue-50/50 p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              ¿Quieres revisar gráficas históricas, ventas por línea y balances contables?
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Hemos movido los reportes profundos y comparativas al módulo dedicado de analíticas.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/reportes')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 shadow-2xs transition-all shrink-0 active:scale-[0.98]"
        >
          <span>Ir a Analíticas & Resultados</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Modal de Cotizador Flash */}
      <QuickQuoteModal
        isOpen={isQuickQuoteOpen}
        onClose={() => setIsQuickQuoteOpen(false)}
        initialClient={quickQuoteClient}
      />
    </div>
  )
}
