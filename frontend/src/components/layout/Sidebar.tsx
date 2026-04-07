import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Factory,
  BarChart3,
  ShoppingCart,
  CreditCard,
  Grid3X3,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  Radio,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  CheckSquare,
  Receipt,
} from 'lucide-react'
import { cn, getInitials } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { toast } from 'sonner'

interface SyncStatusData {
  lastSync: string | null
  status: 'never' | 'ok' | 'error' | 'running'
  clientsSynced: number
  productsSynced: number
  message?: string
}

function MerlinBadge({ collapsed }: { collapsed: boolean }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<SyncStatusData>({
    queryKey: ['sync-status'],
    queryFn: () => api.get<SyncStatusData>('/sync/status').then((r) => r.data),
    refetchInterval: 15_000,
    retry: false,
  })

  const runSync = useMutation({
    mutationFn: () => api.post('/sync/run', {}),
    onSuccess: () => {
      toast.success('Sincronización iniciada — puede tardar 1-2 minutos')
      // Poll more frequently while running
      setTimeout(() => qc.invalidateQueries({ queryKey: ['sync-status'] }), 5000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['sync-status'] }), 15000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['sync-status'] }), 30000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['sync-status'] }), 60000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['sync-status'] }), 120000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (msg?.includes('en curso')) {
        toast.info('Ya hay una sincronización en curso, espera un momento')
      } else {
        toast.error('No se pudo iniciar la sincronización')
      }
    },
  })

  if (isLoading) return null

  const status = data?.status ?? 'never'
  const isRunning = status === 'running' || runSync.isPending

  const icon = isRunning
    ? <RefreshCw className="h-3.5 w-3.5 text-blue-400 shrink-0 animate-spin" />
    : status === 'ok'
    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
    : status === 'error'
    ? <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
    : <Clock className="h-3.5 w-3.5 text-yellow-400 shrink-0" />

  const label = isRunning ? 'Sincronizando...'
    : status === 'ok' ? 'Merlin al día'
    : status === 'error' ? 'Error de sync'
    : 'Sin sincronizar'

  const dot = isRunning ? 'bg-blue-400 animate-pulse'
    : status === 'ok' ? 'bg-green-400'
    : status === 'error' ? 'bg-red-400'
    : 'bg-yellow-400'

  if (collapsed) {
    return (
      <button
        onClick={() => runSync.mutate()}
        disabled={isRunning}
        className="flex justify-center pb-2 w-full"
        title={`${label} — clic para sincronizar`}
      >
        <div className={`w-2 h-2 rounded-full ${dot}`} />
      </button>
    )
  }

  return (
    <div className="mx-2 mb-2 rounded-lg bg-white/5 px-2.5 py-2 space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-slate-300 truncate">{label}</p>
          {data?.lastSync && !isRunning && (
            <p className="text-[9px] text-slate-500 truncate">
              {new Date(data.lastSync).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {data?.message && isRunning && (
            <p className="text-[9px] text-blue-400 truncate">{data.message}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => runSync.mutate()}
        disabled={isRunning}
        className="w-full flex items-center justify-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 text-[10px] font-medium text-slate-300 hover:text-white transition-all"
      >
        <RefreshCw className={`h-2.5 w-2.5 ${isRunning ? 'animate-spin' : ''}`} />
        {isRunning ? 'Sincronizando...' : 'Sincronizar con Merlin'}
      </button>
    </div>
  )
}

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    to: '/',
    icon: <LayoutDashboard className="h-5 w-5" />,
    label: 'Dashboard',
  },
  {
    to: '/clientes',
    icon: <Users className="h-5 w-5" />,
    label: 'Clientes',
    roles: ['GERENTE', 'VENTAS'],
  },
  {
    to: '/cotizaciones',
    icon: <FileText className="h-5 w-5" />,
    label: 'Cotizaciones',
    roles: ['GERENTE', 'VENTAS'],
  },
  {
    to: '/pedidos',
    icon: <Package className="h-5 w-5" />,
    label: 'Pedidos',
    roles: ['GERENTE', 'VENTAS', 'LOGISTICA'],
  },
  {
    to: '/produccion',
    icon: <Factory className="h-5 w-5" />,
    label: 'Producción',
    roles: ['GERENTE', 'LOGISTICA'],
  },
  {
    to: '/inventario',
    icon: <BarChart3 className="h-5 w-5" />,
    label: 'Inventario',
    roles: ['GERENTE', 'LOGISTICA'],
  },
  {
    to: '/compras',
    icon: <ShoppingCart className="h-5 w-5" />,
    label: 'Compras',
    roles: ['GERENTE', 'LOGISTICA'],
  },
  {
    to: '/credito',
    icon: <CreditCard className="h-5 w-5" />,
    label: 'Crédito',
    roles: ['GERENTE', 'VENTAS'],
  },
  {
    to: '/tareas',
    icon: <CheckSquare className="h-5 w-5" />,
    label: 'Tareas',
  },
  {
    to: '/gastos',
    icon: <Receipt className="h-5 w-5" />,
    label: 'Gastos',
  },
  {
    to: '/catalogo',
    icon: <Grid3X3 className="h-5 w-5" />,
    label: 'Catálogo',
    roles: ['GERENTE', 'VENTAS'],
  },
  {
    to: '/reportes',
    icon: <TrendingUp className="h-5 w-5" />,
    label: 'Reportes',
    roles: ['GERENTE'],
  },
  {
    to: '/configuracion',
    icon: <Settings className="h-5 w-5" />,
    label: 'Configuración',
    roles: ['GERENTE'],
  },
  {
    to: '/manual',
    icon: <BookOpen className="h-5 w-5" />,
    label: 'Manual de Uso',
  },
]

const roleLabels: Record<string, string> = {
  GERENTE: 'Gerente',
  VENTAS: 'Ventas',
  LOGISTICA: 'Logística',
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed } = useUIStore()
  const navigate = useNavigate()

  const visibleItems = navItems.filter(
    (item) => !item.roles || !user || item.roles.includes(user.role)
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-[#0F172A] transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <Radio className="h-4 w-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <span className="block text-sm font-bold text-white tracking-wide">
                MARAL
              </span>
              <span className="block text-[10px] font-medium text-blue-400 uppercase tracking-widest -mt-0.5">
                OS
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600/20 text-white ring-1 ring-blue-500/40'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
                )}
                <span
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-white'
                  )}
                >
                  {item.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className={cn('truncate', isActive && 'font-semibold')}>{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Merlin sync status */}
      <MerlinBadge collapsed={sidebarCollapsed} />

      {/* User section */}
      {user && (
        <div className="border-t border-white/10 p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-2 py-2',
              sidebarCollapsed ? 'justify-center' : ''
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
              {getInitials(user.name)}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {user.name}
                </p>
                <p className="text-xs text-slate-400">
                  {roleLabels[user.role] ?? user.role}
                </p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  )
}

export function CollapseButton() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-600 transition-all',
        'absolute -right-3 top-8 z-10'
      )}
    >
      <ChevronLeft
        className={cn(
          'h-3.5 w-3.5 transition-transform',
          sidebarCollapsed && 'rotate-180'
        )}
      />
    </button>
  )
}
