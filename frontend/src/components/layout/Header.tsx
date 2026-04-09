import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Menu, Search, Bell, AlertTriangle, Clock, Package, ChevronRight, X } from 'lucide-react'
import { cn, getInitials } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { dashboardApi } from '../../lib/api'
import { formatCOP } from '../../lib/utils'

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/clientes/nuevo': 'Nuevo Cliente',
  '/cotizaciones': 'Cotizaciones',
  '/cotizaciones/nueva': 'Nueva Cotización',
  '/pedidos': 'Pedidos',
  '/pedidos/nuevo': 'Nuevo Pedido',
  '/inventario': 'Inventario',
  '/produccion': 'Producción',
  '/compras': 'Compras',
  '/credito': 'Crédito',
  '/catalogo': 'Catálogo',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
}

function getBreadcrumb(pathname: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [
    { label: 'MARAL OS', path: '/' },
  ]

  const parts = pathname.split('/').filter(Boolean)
  let currentPath = ''

  for (const part of parts) {
    currentPath += '/' + part
    const label =
      routeLabels[currentPath] ??
      (part.length === 24 || part.length === 36 ? 'Detalle' : part)
    crumbs.push({ label, path: currentPath })
  }

  return crumbs
}

export function Header() {
  const { user } = useAuthStore()
  const { toggleSidebar, toggleCommandPalette, notificationsOpen, toggleNotifications, setNotificationsOpen } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()
  const breadcrumbs = getBreadcrumb(location.pathname)
  const bellRef = useRef<HTMLDivElement>(null)

  // Fetch dashboard data para el conteo de alertas (usa caché compartido con Dashboard)
  const { data: kpis } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    if (!notificationsOpen) return
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notificationsOpen, setNotificationsOpen])

  // Calcular alertas reales
  const alerts = [
    kpis?.overdueReceivables > 0 && {
      id: 'cartera',
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      bg: 'bg-red-50',
      title: 'Cartera vencida',
      desc: `${formatCOP(kpis.overdueReceivables)} en facturas por cobrar`,
      path: '/credito',
    },
    kpis?.overdueFollowUps > 0 && {
      id: 'seguimientos',
      icon: <Clock className="h-4 w-4 text-orange-500" />,
      bg: 'bg-orange-50',
      title: 'Seguimientos vencidos',
      desc: `${kpis.overdueFollowUps} cotizaciones sin respuesta`,
      path: '/cotizaciones',
    },
    kpis?.criticalStock > 0 && {
      id: 'stock',
      icon: <Package className="h-4 w-4 text-yellow-600" />,
      bg: 'bg-yellow-50',
      title: 'Stock crítico',
      desc: `${kpis.criticalStock} productos por debajo del mínimo`,
      path: '/inventario',
    },
  ].filter(Boolean) as { id: string; icon: React.ReactNode; bg: string; title: string; desc: string; path: string }[]

  const alertCount = alerts.length

  const goAlert = (path: string) => {
    navigate(path)
    setNotificationsOpen(false)
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4">
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-1">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <span
              className={cn(
                i === breadcrumbs.length - 1
                  ? 'font-semibold text-gray-900'
                  : 'text-gray-400'
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Search */}
      <button
        onClick={toggleCommandPalette}
        className="flex h-9 w-64 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 hover:border-blue-300 hover:bg-white transition-all"
      >
        <Search className="h-4 w-4" />
        <span>Buscar...</span>
        <kbd className="ml-auto rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          ⌘K
        </kbd>
      </button>

      {/* Notifications */}
      <div ref={bellRef} className="relative">
        <button
          onClick={toggleNotifications}
          className={cn(
            'relative rounded-lg p-2 transition-colors',
            notificationsOpen
              ? 'bg-gray-100 text-gray-700'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          )}
        >
          <Bell className="h-5 w-5" />
          {alertCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>

        {/* Panel dropdown */}
        {notificationsOpen && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-900 text-sm">Alertas del sistema</span>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-1 max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm font-medium text-gray-600">Todo en orden</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sin alertas pendientes</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => goAlert(alert.path)}
                    className="flex w-full items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${alert.bg}`}>
                      {alert.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{alert.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 mt-1 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* User avatar */}
      {user && (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {getInitials(user.name)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">
              {user.name.split(' ')[0]}
            </p>
            <p className="text-xs text-gray-400 leading-tight">{user.role}</p>
          </div>
        </div>
      )}
    </header>
  )
}
