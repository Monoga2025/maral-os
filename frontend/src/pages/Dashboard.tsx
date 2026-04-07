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
} from 'lucide-react'
import type { Task } from '../types'
import { dashboardApi, tasksApi } from '../lib/api'
import { formatCOP, formatDate } from '../lib/utils'
import { KPICard } from '../components/ui/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { PageSkeleton } from '../components/ui/LoadingSkeleton'
import { useNavigate } from 'react-router-dom'
import { TourButton } from '../components/tour/TourButton'

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
    data?.salesLast6Months?.map((s) => ({
      mes: s.month,
      ventas: s.amount,
    })) ?? []

  const barChartData =
    data?.salesByLine?.map((s) => ({
      linea: lineLabels[s.line] ?? s.line,
      ventas: s.amount,
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

      {/* Alerts */}
      {data &&
        (data.criticalStock > 0 ||
          data.unconfirmedOrders > 0 ||
          data.quotationsWithoutFollowup > 0) && (
          <div data-tour="alerts-section" className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Alertas del sistema
            </h2>
            {data.criticalStock > 0 && (
              <div
                className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => navigate('/inventario')}
              >
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="text-sm font-medium text-red-800">
                  {data.criticalStock} productos en stock crítico requieren atención inmediata
                </p>
              </div>
            )}
            {data.unconfirmedOrders > 0 && (
              <div
                className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => navigate('/pedidos')}
              >
                <Clock className="h-5 w-5 text-orange-600 shrink-0" />
                <p className="text-sm font-medium text-orange-800">
                  {data.unconfirmedOrders} pedidos sin confirmar hace más de 3 días
                </p>
              </div>
            )}
            {data.quotationsWithoutFollowup > 0 && (
              <div
                className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 cursor-pointer hover:bg-yellow-100 transition-colors"
                onClick={() => navigate('/cotizaciones')}
              >
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                <p className="text-sm font-medium text-yellow-800">
                  {data.quotationsWithoutFollowup} cotizaciones sin seguimiento programado
                </p>
              </div>
            )}
          </div>
        )}

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
