import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { reportsApi } from '../lib/api'
import { formatCOP } from '../lib/utils'
import { format, subMonths } from 'date-fns'
import { TourButton } from '../components/tour/TourButton'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

const LINE_LABELS: Record<string, string> = {
  ESTACION_BASE: 'Estación Base', MOVIL: 'Móvil', HANDY: 'Handy',
  CABLE: 'Cables', ACCESORIO: 'Accesorios', OTROS: 'Otros',
}

export default function Reports() {
  const [tab, setTab] = useState<'ventas' | 'operaciones'>('ventas')
  const [from, setFrom] = useState(() => format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['report-sales', from, to],
    queryFn: () => reportsApi.getSalesReport(from, to),
  })

  const { data: opsData } = useQuery({
    queryKey: ['report-ops', from, to],
    queryFn: () => reportsApi.getOperationsReport(from, to),
  })

  const sales = salesData?.data ?? {}
  const ops = opsData?.data ?? {}

  const exportCSV = (rows: Record<string, unknown>[], filename: string) => {
    if (!rows?.length) return
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => r[h]).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename + '.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análisis de ventas y operaciones</p>
        </div>
        <TourButton tourId="reportes" />
      </div>

      {/* Date range + tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div data-tour="reports-date-range" className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <span className="text-xs text-gray-500 font-medium">Desde</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="text-sm border-none outline-none bg-transparent" />
          <span className="text-gray-300 mx-1">—</span>
          <span className="text-xs text-gray-500 font-medium">Hasta</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="text-sm border-none outline-none bg-transparent" />
        </div>
        <div data-tour="reports-tabs" className="flex bg-gray-100 rounded-xl p-1">
          {(['ventas', 'operaciones'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      ) : tab === 'ventas' ? (
        <div data-tour="reports-content" className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Ventas totales', value: formatCOP(sales.totalAmount ?? 0), color: 'text-blue-600' },
              { label: 'Pedidos', value: sales.totalOrders ?? 0, color: 'text-gray-900' },
              { label: 'Ticket promedio', value: formatCOP(sales.avgTicket ?? 0), color: 'text-green-600' },
              { label: 'Clientes únicos', value: sales.uniqueClients ?? 0, color: 'text-purple-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Sales by period */}
          {(sales.byPeriod ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Ventas por Período</h2>
                <button onClick={() => exportCSV(sales.byPeriod, 'ventas-periodo')}
                  className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">
                  <Download size={12} />CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sales.byPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => formatCOP(v)} />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* By product line */}
            {(sales.byLine ?? []).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Por Línea de Producto</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sales.byLine} dataKey="amount" nameKey="line" cx="50%" cy="50%" outerRadius={80}
                      label={({ line, percent }: { line: string; percent: number }) => `${LINE_LABELS[line] ?? line} ${(percent * 100).toFixed(0)}%`}>
                      {(sales.byLine ?? []).map((_: unknown, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCOP(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By client */}
            {(sales.byClient ?? []).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Top Clientes</h2>
                  <button onClick={() => exportCSV(sales.byClient, 'ventas-clientes')}
                    className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">
                    <Download size={12} />CSV
                  </button>
                </div>
                <div className="space-y-2">
                  {sales.byClient.slice(0, 8).map((c: { clientName: string; amount: number; orders: number }, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="font-medium text-gray-900 truncate">{c.clientName}</span>
                          <span className="font-semibold text-gray-900 ml-2">{formatCOP(c.amount)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${(c.amount / (sales.byClient[0]?.amount || 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {!(sales.byPeriod ?? []).length && !(sales.byClient ?? []).length && (
            <div className="py-20 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
              <p className="font-medium">Sin datos para el período seleccionado</p>
              <p className="text-sm mt-1">Prueba con un rango de fechas más amplio</p>
            </div>
          )}
        </div>
      ) : (
        /* OPERATIONS TAB */
        <div data-tour="reports-content" className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pedidos despachados', value: ops.dispatched ?? 0, color: 'text-green-600' },
              { label: 'Pendientes', value: ops.pending ?? 0, color: 'text-orange-600' },
              { label: 'Tiempo promedio (días)', value: ops.avgFulfillmentDays?.toFixed(1) ?? '—', color: 'text-blue-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {(ops.topProducts ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Productos más Producidos</h2>
              <div className="space-y-3">
                {ops.topProducts.map((p: { productName: string; qty: number }, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="font-medium text-gray-900">{p.productName}</span>
                        <span className="text-gray-600">{p.qty} und.</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-orange-400 h-1.5 rounded-full"
                          style={{ width: `${(p.qty / (ops.topProducts[0]?.qty || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
