import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  AlertCircle,
  Clock,
  Activity,
  TrendingUp,
  RefreshCw,
  Sparkles,
  CheckSquare,
  ChevronRight,
  Plus,
  Receipt,
} from 'lucide-react'
import type { Task } from '../types'
import { dashboardApi, tasksApi } from '../lib/api'
import { formatCOP, formatDate } from '../lib/utils'
import { KPICard } from '../components/ui/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { PageSkeleton } from '../components/ui/LoadingSkeleton'
import { useNavigate } from 'react-router-dom'
import { TourButton } from '../components/tour/TourButton'
import { DailyBriefing } from '../components/ui/DailyBriefing'

const SALES_GOAL = 40_000_000

const lineLabels: Record<string, string> = {
  ESTANDAR: 'Estándar',
  PREMIUM: 'Premium',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: salesChart } = useQuery({
    queryKey: ['dashboard-sales-chart'],
    queryFn: () => dashboardApi.getSalesChart().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: salesByLine } = useQuery({
    queryKey: ['dashboard-sales-by-line'],
    queryFn: () => dashboardApi.getSalesByLine().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: pendingTasks } = useQuery<Task[]>({
    queryKey: ['tasks-pending'],
    queryFn: () => tasksApi.getAll({ status: 'PENDIENTE' }).then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading && !data) return <PageSkeleton />

  const today = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })

  const salesPct = data
    ? Math.min((data.salesThisMonth / SALES_GOAL) * 100, 100)
    : 0

  const salesChartData =
    salesChart?.map((s) => ({
      mes: s.label,
      ventas: s.sales,
    })) ?? []

  const barChartData =
    salesByLine?.byLine?.map((s) => ({
      linea: lineLabels[s.line] ?? s.line,
      ventas: s.revenue,
    })) ?? []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="dashboard" />
          {isFetching && !isLoading ? (
            <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
          ) : (
            <Activity className="h-5 w-5 text-green-500" />
          )}
          <span className="text-sm font-medium text-gray-600">Sistema operativo</span>
        </div>
      </div>

      {/* AI Daily Briefing */}
      <DailyBriefing />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Nueva Cotización', icon: <FileText className="h-4 w-4" />, path: '/cotizaciones/nueva', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
          { label: 'Nuevo Pedido',     icon: <Package className="h-4 w-4" />,  path: '/pedidos/nuevo',      color: 'bg-orange-500 hover:bg-orange-600 text-white' },
          { label: 'Nueva Tarea',      icon: <CheckSquare className="h-4 w-4" />, path: '/tareas',          color: 'bg-purple-600 hover:bg-purple-700 text-white' },
          { label: 'Registrar Gasto',  icon: <Receipt className="h-4 w-4" />,  path: '/gastos',             color: 'bg-green-600 hover:bg-green-700 text-white' },
        ].map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.color}`}
          >
            <Plus className="h-3.5 w-3.5" />
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div data-tour="kpi-cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Ventas del Mes"
          value={formatCOP(data?.salesThisMonth ?? 0)}
          icon={<DollarSign className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle={`Meta: ${formatCOP(SALES_GOAL)}`}
          progress={{
            value: data?.salesThisMonth ?? 0,
            max: SALES_GOAL,
            percentage: salesPct,
            label: 'Del objetivo mensual',
          }}
        />
        <KPICard
          label="Pedidos Activos"
          value={data?.activeOrders ?? 0}
          icon={<Package className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-50"
          subtitle={
            data?.ordersByStatus
              ? `${data.ordersByStatus.EN_PRODUCCION ?? 0} en producción`
              : undefined
          }
          onClick={() => navigate('/pedidos')}
        />
        <KPICard
          label="Cotizaciones Pendientes"
          value={data?.pendingQuotations ?? 0}
          icon={<FileText className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          subtitle={
            data?.overdueFollowUps
              ? `${data.overdueFollowUps} seguimientos vencidos`
              : 'Sin seguimientos vencidos'
          }
          onClick={() => navigate('/cotizaciones')}
        />
        <KPICard
          label="Cartera Vencida"
          value={formatCOP(data?.overdueReceivables ?? 0)}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
          subtitle="Facturas con mora"
          onClick={() => navigate('/credito')}
        />
      </div>

      {/* Primeros pasos - only shown when system is empty */}
      {data && data.activeOrders === 0 && data.pendingQuotations === 0 && (
        <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-blue-900">¡Bienvenidos! ¿Por dónde empezamos?</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Registra tus clientes', desc: 'Crea la base de clientes de Maral con sus datos de contacto y cupos de crédito.', href: '/clientes/nuevo', action: 'Agregar cliente' },
              { step: '2', title: 'Crea una cotización', desc: 'Envía una propuesta de precios a un cliente. Puedes convertirla en pedido cuando la acepten.', href: '/cotizaciones/nueva', action: 'Nueva cotización' },
              { step: '3', title: 'Registra un pedido', desc: 'Cuando un cliente confirma la compra, crea el pedido y haz seguimiento hasta la entrega.', href: '/pedidos/nuevo', action: 'Crear pedido' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">{item.step}</span>
                  <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{item.desc}</p>
                <button onClick={() => navigate(item.href)} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  {item.action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚡ Requieren atención — ARRIBA DEL FOLD */}
      {data &&
        (data.criticalStock > 0 ||
          data.unconfirmedOrders > 0 ||
          data.quotationsWithoutFollowup > 0 ||
          (data as any).stalledOrders > 0 ||
          (data as any).overdueInvoicesCount > 0) && (
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 space-y-2">
            <h2 className="text-sm font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Requieren tu atención ahora
            </h2>
            {(data as any).stalledOrders > 0 && (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white px-4 py-2.5 cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => navigate('/pedidos')}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm font-medium text-red-800">
                    {(data as any).stalledOrders} pedido{(data as any).stalledOrders !== 1 ? 's' : ''} sin movimiento hace 5+ días
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-red-400 shrink-0" />
              </div>
            )}
            {(data as any).overdueInvoicesCount > 0 && (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-white px-4 py-2.5 cursor-pointer hover:bg-orange-50 transition-colors"
                onClick={() => navigate('/credito')}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                  <p className="text-sm font-medium text-orange-800">
                    {(data as any).overdueInvoicesCount} factura{(data as any).overdueInvoicesCount !== 1 ? 's' : ''} vencida{(data as any).overdueInvoicesCount !== 1 ? 's' : ''} — {formatCOP(data.overdueReceivables ?? 0)} en mora
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-orange-400 shrink-0" />
              </div>
            )}
            {data.criticalStock > 0 && (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-white px-4 py-2.5 cursor-pointer hover:bg-yellow-50 transition-colors"
                onClick={() => navigate('/inventario')}
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-yellow-600 shrink-0" />
                  <p className="text-sm font-medium text-yellow-800">
                    {data.criticalStock} producto{data.criticalStock !== 1 ? 's' : ''} con stock crítico
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-yellow-400 shrink-0" />
              </div>
            )}
            {data.unconfirmedOrders > 0 && (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/pedidos')}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-500 shrink-0" />
                  <p className="text-sm font-medium text-gray-700">
                    {data.unconfirmedOrders} pedido{data.unconfirmedOrders !== 1 ? 's' : ''} sin confirmar hace 3+ días
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </div>
            )}
            {data.quotationsWithoutFollowup > 0 && (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/cotizaciones')}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                  <p className="text-sm font-medium text-gray-700">
                    {data.quotationsWithoutFollowup} cotización{data.quotationsWithoutFollowup !== 1 ? 'es' : ''} sin seguimiento
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </div>
            )}
          </div>
        )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Line chart: sales trend */}
        <Card data-tour="sales-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Ventas últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number) => [formatCOP(v), 'Ventas']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ventas"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar chart: sales by line */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas por línea de producto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barChartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="linea"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number) => [formatCOP(v), 'Ventas']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="ventas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>


      {/* Pending tasks widget */}
      {pendingTasks && pendingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                Tareas pendientes
              </span>
              <button
                onClick={() => navigate('/tareas')}
                className="flex items-center gap-1 text-xs font-normal text-blue-600 hover:text-blue-800"
              >
                Ver todas <ChevronRight className="h-3 w-3" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-1">
              {pendingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/tareas')}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    task.priority === 'URGENTE' ? 'bg-red-500' :
                    task.priority === 'NORMAL'  ? 'bg-blue-400' : 'bg-gray-300'
                  }`} />
                  <p className="flex-1 text-sm text-gray-700 truncate">{task.title}</p>
                  {task.priority === 'URGENTE' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full shrink-0">
                      URGENTE
                    </span>
                  )}
                  {task.assignedTo && (
                    <span className="text-xs text-gray-400 shrink-0">{task.assignedTo.name.split(' ')[0]}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card data-tour="activity-log">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500" />
            Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {data?.recentActivity?.length ? (
            <div className="space-y-1">
              {data.recentActivity.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activity.user?.name} · {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Sin actividad reciente registrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
