import { useLocation } from 'react-router-dom'
import { Menu, Search, Bell } from 'lucide-react'
import { cn, getInitials } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'

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
  const { toggleSidebar, toggleCommandPalette } = useUIStore()
  const location = useLocation()
  const breadcrumbs = getBreadcrumb(location.pathname)

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
      <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
          3
        </span>
      </button>

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
