import { useQuery } from '@tanstack/react-query'
import {
  Search,
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  ShoppingCart,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { dashboardApi } from '../../lib/api'
import { formatCOP } from '../../lib/utils'
import type { DashboardData } from '../../types'

interface KPI {
  label: string
  value: string
  icon: React.ReactNode
}

function buildKPIs(data: DashboardData): KPI[] {
  return [
    {
      label: 'Ventas del Mes',
      value: formatCOP(data.salesThisMonth),
      icon: <DollarSign size={18} className="text-[#22C55E]" />,
    },
    {
      label: 'Pedidos Activos',
      value: String(data.activeOrders),
      icon: <Package size={18} className="text-[#22C55E]" />,
    },
    {
      label: 'Cotizaciones',
      value: String(data.pendingQuotations),
      icon: <FileText size={18} className="text-[#22C55E]" />,
    },
    {
      label: 'Cartera Vencida',
      value: formatCOP(data.overdueReceivables),
      icon: <AlertTriangle size={18} className="text-[#22C55E]" />,
    },
  ]
}

interface Alert {
  label: string
  count: number
  icon: React.ReactNode
}

function buildAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = []
  if (data.criticalStock > 0) {
    alerts.push({
      label: 'Productos sin stock',
      count: data.criticalStock,
      icon: <AlertCircle size={14} className="text-red-400" />,
    })
  }
  if (data.unconfirmedOrders > 0) {
    alerts.push({
      label: 'Pedidos sin confirmar',
      count: data.unconfirmedOrders,
      icon: <ShoppingCart size={14} className="text-orange-400" />,
    })
  }
  if (data.overdueFollowUps > 0) {
    alerts.push({
      label: 'Seguimientos vencidos',
      count: data.overdueFollowUps,
      icon: <Clock size={14} className="text-yellow-400" />,
    })
  }
  return alerts
}

export default function MobileDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
  })

  const kpis = data ? buildKPIs(data) : []
  const alerts = data ? buildAlerts(data) : []

  return (
    <div className="space-y-5 pt-2">
      {/* Search bar */}
      <button
        className="w-full flex items-center gap-3 bg-[#141C26] border border-[#1E2D3D] rounded-full px-4 py-3 text-[#475569]"
        onClick={() => {
          const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
          })
          document.dispatchEvent(event)
        }}
      >
        <Search size={16} className="text-[#22C55E] shrink-0" />
        <span className="text-sm">Buscar clientes, pedidos...</span>
        <span className="ml-auto text-xs bg-[#1E2D3D] rounded px-1.5 py-0.5">
          ⌘K
        </span>
      </button>

      {/* KPI cards */}
      <section>
        <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">
          Resumen
        </h2>
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[#141C26] rounded-2xl p-4 border border-[#1E2D3D] min-w-[160px] shrink-0 animate-pulse"
              >
                <div className="w-10 h-10 bg-[#1E2D3D] rounded-xl mb-3" />
                <div className="h-3 bg-[#1E2D3D] rounded w-20 mb-2" />
                <div className="h-5 bg-[#1E2D3D] rounded w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="bg-[#141C26] rounded-2xl p-4 border border-[#1E2D3D] min-w-[160px] shrink-0"
              >
                <div className="w-10 h-10 bg-[#14532D] rounded-xl flex items-center justify-center mb-3">
                  {kpi.icon}
                </div>
                <p className="text-[#94A3B8] text-xs mb-1">{kpi.label}</p>
                <p className="text-[#F1F5F9] text-xl font-bold leading-tight">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">
            Requieren atención
          </h2>
          <div className="bg-[#1A0A0A] border border-[#7F1D1D] rounded-2xl overflow-hidden">
            {alerts.map((alert, idx) => (
              <div
                key={alert.label}
                className={`flex items-center gap-3 px-4 py-3 ${
                  idx < alerts.length - 1 ? 'border-b border-[#7F1D1D]' : ''
                }`}
              >
                {alert.icon}
                <span className="text-[#F1F5F9] text-sm flex-1">
                  {alert.label}
                </span>
                <span className="text-xs font-bold bg-[#7F1D1D] text-red-300 rounded-full px-2 py-0.5">
                  {alert.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-3">
          Actividad reciente
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#141C26] rounded-xl p-3 border border-[#1E2D3D] animate-pulse"
              >
                <div className="h-3 bg-[#1E2D3D] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#1E2D3D] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {data.recentActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="bg-[#141C26] rounded-xl p-3 border border-[#1E2D3D]"
              >
                <p className="text-[#F1F5F9] text-sm leading-snug">
                  {activity.description}
                </p>
                <p className="text-[#475569] text-xs mt-1">
                  {activity.user?.name ?? '—'} · {activity.entity}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#475569] text-sm text-center py-4">
            Sin actividad reciente
          </p>
        )}
      </section>
    </div>
  )
}
