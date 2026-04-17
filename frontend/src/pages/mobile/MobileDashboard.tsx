import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Package,
  FileText,
  AlertTriangle,
  ShoppingCart,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Bell,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { dashboardApi } from '../../lib/api'
import { formatCOP } from '../../lib/utils'
import type { DashboardData } from '../../types'

// --- helpers ---

function goalPercent(data: DashboardData) {
  if (!data.salesGoal || data.salesGoal === 0) return 0
  return Math.min(100, Math.round((data.salesThisMonth / data.salesGoal) * 100))
}

function shortCOP(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

// Circular progress SVG
function Ring({ pct }: { pct: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={88} height={88} className="shrink-0">
      <circle cx={44} cy={44} r={r} stroke="#1E2D3D" strokeWidth={7} fill="none" />
      <circle
        cx={44}
        cy={44}
        r={r}
        stroke="#22C55E"
        strokeWidth={7}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={44} y={49} textAnchor="middle" fill="#F1F5F9" fontSize={15} fontWeight="bold">
        {pct}%
      </text>
    </svg>
  )
}

interface AlertItem {
  label: string
  count: number
  icon: React.ReactNode
  color: string
}

function buildAlerts(data: DashboardData & Record<string, unknown>): AlertItem[] {
  const alerts: AlertItem[] = []
  if (data.criticalStock > 0)
    alerts.push({ label: 'Sin stock', count: data.criticalStock, icon: <AlertCircle size={14} />, color: '#EF4444' })
  if (data.unconfirmedOrders > 0)
    alerts.push({ label: 'Pedidos sin confirmar', count: data.unconfirmedOrders, icon: <ShoppingCart size={14} />, color: '#F97316' })
  if ((data.stalledOrders as number) > 0)
    alerts.push({ label: 'Pedidos estancados', count: data.stalledOrders as number, icon: <Clock size={14} />, color: '#EAB308' })
  if (data.overdueFollowUps > 0)
    alerts.push({ label: 'Seguimientos vencidos', count: data.overdueFollowUps, icon: <Clock size={14} />, color: '#A78BFA' })
  return alerts
}

// Custom tooltip for bar chart
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1E2D3D] border border-[#2D3F50] rounded-lg px-3 py-1.5 text-xs">
      <p className="text-[#94A3B8] mb-0.5">{label}</p>
      <p className="text-[#22C55E] font-bold">{shortCOP(payload[0].value)}</p>
    </div>
  )
}

// Skeleton block
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-[#1E2D3D] rounded-lg animate-pulse ${className ?? ''}`} />
}

export default function MobileDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
  })

  const pct = data ? goalPercent(data) : 0
  const alerts = data ? buildAlerts(data as DashboardData & Record<string, unknown>) : []
  const chartData = data?.salesLast6Months ?? []

  const firstName = user?.name?.split(' ')[0] ?? 'Hola'

  return (
    <div className="space-y-4 pt-1 pb-2">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#475569] text-xs">Hoy, {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          <h1 className="text-[#F1F5F9] text-lg font-bold leading-tight">Buen día, {firstName}</h1>
        </div>
        {alerts.length > 0 && (
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#141C26] border border-[#1E2D3D] flex items-center justify-center">
              <Bell size={16} className="text-[#94A3B8]" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {alerts.length}
            </span>
          </div>
        )}
      </div>

      {/* Hero card — Ventas del mes */}
      {isLoading ? (
        <Skeleton className="h-36 rounded-3xl" />
      ) : (
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0D2818 0%, #14532D 50%, #166534 100%)' }}
        >
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-green-300/70 text-xs font-medium uppercase tracking-widest mb-1">
                Ventas del mes
              </p>
              <p className="text-white text-3xl font-black leading-none tracking-tight">
                {shortCOP(data?.salesThisMonth ?? 0)}
              </p>
              <p className="text-green-300/60 text-xs mt-2">
                {formatCOP(data?.salesThisMonth ?? 0)}
              </p>
              {data?.salesGoal ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-300/70 text-[11px]">Meta mensual</span>
                    <span className="text-green-300 text-[11px] font-semibold">{shortCOP(data.salesGoal)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#22C55E] rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <Ring pct={pct} />
          </div>
        </div>
      )}

      {/* 2×2 KPI grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Pedidos Activos */}
          <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#0D2818] flex items-center justify-center">
                <Package size={15} className="text-[#22C55E]" />
              </div>
              <TrendingUp size={12} className="text-[#22C55E] opacity-60" />
            </div>
            <p className="text-[#F1F5F9] text-2xl font-black">{data?.activeOrders ?? 0}</p>
            <p className="text-[#475569] text-[11px] mt-0.5">Pedidos activos</p>
          </div>

          {/* Cotizaciones */}
          <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#172554] flex items-center justify-center">
                <FileText size={15} className="text-[#60A5FA]" />
              </div>
            </div>
            <p className="text-[#F1F5F9] text-2xl font-black">{data?.pendingQuotations ?? 0}</p>
            <p className="text-[#475569] text-[11px] mt-0.5">Cotizaciones</p>
          </div>

          {/* Cartera vencida */}
          <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#1A0A0A] flex items-center justify-center">
                <AlertTriangle size={15} className="text-[#F87171]" />
              </div>
            </div>
            <p className="text-[#F1F5F9] text-lg font-black leading-tight">
              {shortCOP(data?.overdueReceivables ?? 0)}
            </p>
            <p className="text-[#475569] text-[11px] mt-0.5">Cartera vencida</p>
          </div>

          {/* Stock crítico */}
          <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#1C1500] flex items-center justify-center">
                <AlertCircle size={15} className="text-[#FBBF24]" />
              </div>
            </div>
            <p className="text-[#F1F5F9] text-2xl font-black">{data?.criticalStock ?? 0}</p>
            <p className="text-[#475569] text-[11px] mt-0.5">Stock crítico</p>
          </div>
        </div>
      )}

      {/* Sales trend chart */}
      {chartData.length > 0 && (
        <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#F1F5F9] text-sm font-semibold">Tendencia de ventas</h2>
            <span className="text-[#475569] text-[11px]">6 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={chartData} barSize={18} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => shortCOP(v)}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#1E2D3D' }} />
              <Bar dataKey="amount" fill="#22C55E" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Bell size={14} className="text-[#94A3B8]" />
            <h2 className="text-[#F1F5F9] text-sm font-semibold">Requieren atención</h2>
          </div>
          {alerts.map((a, idx) => (
            <div
              key={a.label}
              className={`flex items-center gap-3 px-4 py-3 ${idx < alerts.length - 1 ? 'border-b border-[#1E2D3D]' : ''}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              <span style={{ color: a.color }} className="shrink-0">{a.icon}</span>
              <span className="text-[#CBD5E1] text-sm flex-1 leading-none">{a.label}</span>
              <span
                className="text-xs font-bold rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${a.color}22`, color: a.color }}
              >
                {a.count}
              </span>
              <ChevronRight size={14} className="text-[#334155]" />
            </div>
          ))}
        </div>
      )}

      {/* Recent activity — transaction style */}
      <div className="bg-[#141C26] border border-[#1E2D3D] rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[#F1F5F9] text-sm font-semibold">Actividad reciente</h2>
        </div>
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.recentActivity && data.recentActivity.length > 0 ? (
          <div>
            {data.recentActivity.slice(0, 6).map((a, idx) => (
              <div
                key={a.id}
                className={`flex items-start gap-3 px-4 py-3 ${idx < Math.min(data.recentActivity.length, 6) - 1 ? 'border-b border-[#1E2D3D]' : ''}`}
              >
                {/* avatar */}
                <div className="w-9 h-9 rounded-xl bg-[#0D1B2A] flex items-center justify-center shrink-0">
                  <span className="text-[#22C55E] text-xs font-bold">
                    {(a.user?.name ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#CBD5E1] text-xs leading-snug line-clamp-2">{a.description}</p>
                  <p className="text-[#334155] text-[11px] mt-0.5">
                    {a.user?.name ?? '—'} · <span className="text-[#475569]">{a.entity}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#334155] text-sm text-center px-4 py-6">Sin actividad reciente</p>
        )}
      </div>
    </div>
  )
}
