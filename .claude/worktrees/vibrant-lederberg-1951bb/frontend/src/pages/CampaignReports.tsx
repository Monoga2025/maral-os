import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Download, TrendingUp, Flame, FileText, ShoppingCart, DollarSign } from 'lucide-react'
import { notificationsApi } from '../lib/api'

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const TEMP_COLORS: Record<string, string> = {
  HOT: '#ef4444',
  WARM: '#f97316',
  COLD: '#3b82f6',
  OPTOUT: '#9ca3af',
  OFFTOPIC: '#d1d5db',
}

export default function CampaignReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['global-campaign-report'],
    queryFn: () => notificationsApi.globalReport().then((r) => r.data as GlobalReport),
  })

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  if (!data) return null

  // Build funnel data from recipient statuses
  const statusMap = Object.fromEntries(
    (data.recipientsByStatus ?? []).map((s: { status: string; _count: number }) => [s.status, s._count])
  )
  const sent      = (statusMap['SENT'] ?? 0) + (statusMap['DELIVERED'] ?? 0) + (statusMap['READ'] ?? 0) + (statusMap['REPLIED'] ?? 0) + (statusMap['CONVERTED'] ?? 0)
  const delivered = (statusMap['DELIVERED'] ?? 0) + (statusMap['READ'] ?? 0) + (statusMap['REPLIED'] ?? 0) + (statusMap['CONVERTED'] ?? 0)
  const readCount = (statusMap['READ'] ?? 0) + (statusMap['REPLIED'] ?? 0) + (statusMap['CONVERTED'] ?? 0)
  const replied   = (statusMap['REPLIED'] ?? 0) + (statusMap['CONVERTED'] ?? 0)
  const hot       = (data.recipientsByTemperature ?? []).find((t: { temperature: string }) => t.temperature === 'HOT')?._count ?? 0
  const converted = statusMap['CONVERTED'] ?? 0

  const funnelData = [
    { name: 'Enviados',      value: sent,                    fill: '#1e3a5f' },
    { name: 'Entregados',    value: delivered,               fill: '#2563eb' },
    { name: 'Leídos',        value: readCount,               fill: '#3b82f6' },
    { name: 'Respondieron',  value: replied,                 fill: '#f97316' },
    { name: 'HOT',           value: hot,                     fill: '#ef4444' },
    { name: 'Cotizados',     value: data.quotationsFromCampaigns ?? 0, fill: '#8b5cf6' },
    { name: 'Pedidos',       value: data.ordersFromCampaigns ?? 0,     fill: '#10b981' },
  ].filter((d) => d.value > 0)

  // Campaign comparison table
  const campaigns = (data.campaigns ?? []) as CampaignRow[]

  const downloadCSV = () => {
    const rows = [
      ['Campaña', 'Estado', 'Enviados', 'Respondidos', 'Cotizaciones', 'Pedidos', 'Revenue COP'],
      ...campaigns.map((c) => [
        c.name,
        c.status,
        c.metrics?.sent ?? 0,
        c.metrics?.replied ?? 0,
        '-',
        '-',
        c.metrics?.revenueCOP ?? 0,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campanas_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Reportes de campañas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Funnel global y resultados por campaña</p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Leads calientes',   value: hot,                            icon: <Flame className="h-5 w-5 text-red-500" />,    color: 'text-red-600'   },
          { label: 'Cotizaciones',       value: data.quotationsFromCampaigns,   icon: <FileText className="h-5 w-5 text-blue-500" />, color: 'text-blue-600'  },
          { label: 'Pedidos cerrados',   value: data.ordersFromCampaigns,       icon: <ShoppingCart className="h-5 w-5 text-green-500" />, color: 'text-green-600' },
          { label: 'Revenue total',      value: COP(data.revenueFromCampaigns), icon: <DollarSign className="h-5 w-5 text-yellow-500" />, color: 'text-yellow-700', raw: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">{kpi.icon}<span className="text-xs text-gray-500">{kpi.label}</span></div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      {funnelData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Embudo global</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => v.toLocaleString('es-CO')} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Temperature breakdown */}
      {data.recipientsByTemperature?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Distribución de temperatura</h2>
          <div className="flex flex-wrap gap-3">
            {(data.recipientsByTemperature as { temperature: string; _count: number }[]).map((t) => (
              <div
                key={t.temperature}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border"
                style={{ borderColor: TEMP_COLORS[t.temperature] + '40', backgroundColor: TEMP_COLORS[t.temperature] + '10' }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TEMP_COLORS[t.temperature] }} />
                <span className="text-sm font-medium" style={{ color: TEMP_COLORS[t.temperature] }}>{t.temperature}</span>
                <span className="text-sm text-gray-600">{t._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign comparison table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Comparativa por campaña</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                <th className="px-4 py-3 text-left">Campaña</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Enviados</th>
                <th className="px-4 py-3 text-right">Leídos</th>
                <th className="px-4 py-3 text-right">Respuestas</th>
                <th className="px-4 py-3 text-right">Convertidos</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const m = c.metrics
                const respRate = m?.sent ? ((m.replied / m.sent) * 100).toFixed(1) : '—'
                return (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === 'EN_CURSO' ? 'bg-green-100 text-green-700' :
                        c.status === 'COMPLETADA' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{m?.sent ?? 0}</td>
                    <td className="px-4 py-3 text-right">{m?.read ?? 0}</td>
                    <td className="px-4 py-3 text-right">{m?.replied ?? 0} <span className="text-[10px] text-gray-400">({respRate}%)</span></td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{m?.converted ?? 0}</td>
                    <td className="px-4 py-3 text-right font-medium">{m?.revenueCOP ? COP(Number(m.revenueCOP)) : '—'}</td>
                  </tr>
                )
              })}
              {campaigns.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Sin campañas todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface CampaignRow {
  id: string
  name: string
  status: string
  metrics?: { sent: number; read: number; replied: number; converted: number; revenueCOP: number }
}

interface GlobalReport {
  campaigns: CampaignRow[]
  recipientsByStatus: { status: string; _count: number }[]
  recipientsByTemperature: { temperature: string; _count: number }[]
  quotationsFromCampaigns: number
  ordersFromCampaigns: number
  revenueFromCampaigns: number
}
