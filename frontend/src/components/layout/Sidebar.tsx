import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
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
  ChevronDown,
  Radio,
  BookOpen,
  CheckSquare,
  Receipt,
  MessageCircle,
  Megaphone,
  Tag,
} from 'lucide-react'
import { cn, getInitials } from '../../lib/utils'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles?: string[]
  badge?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: '🚀 Mi Ruta de Hoy' },
    ],
  },
  {
    label: 'Comercial & Clientes',
    items: [
      { to: '/cotizaciones', icon: <FileText className="h-5 w-5" />,       label: 'Cotizaciones Flash', roles: ['GERENTE', 'VENTAS'] },
      { to: '/pedidos',      icon: <Package className="h-5 w-5" />,        label: 'Pedidos & Despachos', roles: ['GERENTE', 'VENTAS', 'LOGISTICA', 'CONTADORA'] },
      { to: '/clientes',     icon: <Users className="h-5 w-5" />,         label: 'Clientes & Radar',   roles: ['GERENTE', 'VENTAS'] },
      { to: '/whatsapp',     icon: <MessageCircle className="h-5 w-5" />,  label: 'WhatsApp Assist',   roles: ['GERENTE', 'VENTAS'] },
      { to: '/campanas',     icon: <Megaphone className="h-5 w-5" />,       label: 'Campañas B2B',      roles: ['GERENTE', 'VENTAS'] },
    ],
  },
  {
    label: 'Taller & Producción',
    items: [
      { to: '/produccion', icon: <Factory className="h-5 w-5" />,    label: 'Órdenes de Taller', roles: ['GERENTE', 'LOGISTICA'] },
      { to: '/inventario', icon: <BarChart3 className="h-5 w-5" />,  label: 'Insumos & Stock',   roles: ['GERENTE', 'LOGISTICA'] },
      { to: '/compras',    icon: <ShoppingCart className="h-5 w-5" />, label: 'Compras de Material', roles: ['GERENTE', 'LOGISTICA'] },
    ],
  },
  {
    label: 'Finanzas & Cartera',
    items: [
      { to: '/credito', icon: <CreditCard className="h-5 w-5" />, label: 'Cobro de Cartera', roles: ['GERENTE', 'VENTAS', 'CONTADORA'] },
      { to: '/gastos',  icon: <Receipt className="h-5 w-5" />,    label: 'Gastos de Caja' },
    ],
  },
  {
    label: 'Métricas & Balance',
    items: [
      { to: '/reportes', icon: <TrendingUp className="h-5 w-5" />, label: '📊 Analíticas & Resultados', roles: ['GERENTE', 'CONTADORA'] },
    ],
  },
]

const settingsItems: NavItem[] = [
  { to: '/tareas',        icon: <CheckSquare className="h-5 w-5" />, label: 'Lista de Tareas' },
  { to: '/catalogo',      icon: <Grid3X3 className="h-5 w-5" />,   label: 'Catálogo de Productos', roles: ['GERENTE', 'VENTAS'] },
  { to: '/configuracion', icon: <Settings className="h-5 w-5" />,   label: 'Configuración',         roles: ['GERENTE'] },
  { to: '/manual',        icon: <BookOpen className="h-5 w-5" />,   label: 'Manual de Uso' },
]

const roleLabels: Record<string, string> = {
  GERENTE: 'Gerente General',
  VENTAS: 'Ventas & Mercadeo',
  LOGISTICA: 'Producción & Logística',
  CONTADORA: 'Contabilidad',
}

export function Sidebar({ hotLeadCount = 0 }: { hotLeadCount?: number }) {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed } = useUIStore()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [opsOpen, setOpsOpen] = useState(false)
  const [isSalesMode, setIsSalesMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('maral-sales-focus-mode')
    return saved !== null ? saved === 'true' : true
  })

  const toggleSalesMode = () => {
    setIsSalesMode((prev) => {
      const next = !prev
      localStorage.setItem('maral-sales-focus-mode', String(next))
      return next
    })
  }

  const { data: pendingTasks } = useQuery<number>({
    queryKey: ['tasks-count'],
    queryFn: () =>
      api.get<{ data: unknown[] }>('/tasks', { params: { status: 'PENDIENTE', limit: 50 } })
        .then((r) => r.data.data.length),
    staleTime: 60_000,
    retry: false,
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const renderItem = (item: NavItem) => (
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
          <span className={cn('shrink-0 transition-colors', isActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-white')}>
            {item.icon}
          </span>
          {!sidebarCollapsed && (
            <span className={cn('truncate flex-1', isActive && 'font-semibold')}>{item.label}</span>
          )}
          {!sidebarCollapsed && item.to === '/tareas' && pendingTasks && pendingTasks > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {pendingTasks > 99 ? '99+' : pendingTasks}
            </span>
          )}
          {sidebarCollapsed && item.to === '/tareas' && pendingTasks && pendingTasks > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
          {!sidebarCollapsed && item.to === '/whatsapp' && hotLeadCount > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
              {hotLeadCount > 9 ? '9+' : hotLeadCount}
            </span>
          )}
          {sidebarCollapsed && item.to === '/whatsapp' && hotLeadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </>
      )}
    </NavLink>
  )

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
              <span className="block text-sm font-bold text-white tracking-wide">MARAL</span>
              <span className="block text-[10px] font-medium text-blue-400 uppercase tracking-widest -mt-0.5">OS</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      {!sidebarCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={toggleSalesMode}
            className={cn(
              'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all',
              isSalesMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
            )}
            title="Alternar entre vista simplificada de ventas o vista completa"
          >
            <span>{isSalesMode ? '🚀 Modo Ventas' : '⚙️ Modo Completo'}</span>
            <span className="text-[10px] opacity-70 font-normal">{isSalesMode ? 'Simple' : 'Todos'}</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {isSalesMode ? (
          /* Simplified Sales View */
          <div className="space-y-3">
            <div>
              <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Ventas Rápidas
              </p>
              <div className="space-y-0.5">
                {renderItem({ to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard Cockpit' })}
                {renderItem({ to: '/cotizaciones', icon: <FileText className="h-5 w-5" />, label: 'Cotizaciones' })}
                {renderItem({ to: '/pedidos', icon: <Package className="h-5 w-5" />, label: 'Pedidos' })}
                {renderItem({ to: '/clientes', icon: <Users className="h-5 w-5" />, label: 'Clientes & Radar' })}
                {renderItem({ to: '/whatsapp', icon: <MessageCircle className="h-5 w-5" />, label: 'WhatsApp Assist' })}
              </div>
            </div>

            {/* Collapsible Operations & Admin in Sales Mode */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setOpsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <span>📦 Operaciones & Finanzas</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', opsOpen && 'rotate-180')} />
              </button>

              {opsOpen && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-white/10 ml-3">
                  {renderItem({ to: '/produccion', icon: <Factory className="h-4 w-4" />, label: 'Producción' })}
                  {renderItem({ to: '/inventario', icon: <BarChart3 className="h-4 w-4" />, label: 'Inventario' })}
                  {renderItem({ to: '/compras', icon: <ShoppingCart className="h-4 w-4" />, label: 'Compras' })}
                  {renderItem({ to: '/credito', icon: <CreditCard className="h-4 w-4" />, label: 'Crédito' })}
                  {renderItem({ to: '/gastos', icon: <Receipt className="h-4 w-4" />, label: 'Gastos' })}
                  {renderItem({ to: '/tareas', icon: <CheckSquare className="h-4 w-4" />, label: 'Tareas' })}
                  {renderItem({ to: '/campanas', icon: <Megaphone className="h-4 w-4" />, label: 'Campañas' })}
                  {renderItem({ to: '/etiquetas', icon: <Tag className="h-4 w-4" />, label: 'Etiquetas' })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Full Mode */
          navGroups.map((group) => {
            const visible = group.items.filter(
              (item) => !item.roles || !user || item.roles.includes(user.role)
            )
            if (visible.length === 0) return null
            return (
              <div key={group.label} className="mb-3">
                {group.label && !sidebarCollapsed && (
                  <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                    {group.label}
                  </p>
                )}
                {group.label && sidebarCollapsed && (
                  <div className="my-1 mx-3 h-px bg-white/10" />
                )}
                <div className="space-y-0.5">
                  {visible.map(renderItem)}
                </div>
              </div>
            )
          })
        )}
      </nav>

      {/* Ajustes accordion */}
      <div className="px-2 pb-2">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className={cn(
            'group flex w-full items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-all',
            settingsOpen ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/8 hover:text-white'
          )}
          title="Ajustes"
        >
          <span className={cn('shrink-0 transition-colors', settingsOpen ? 'text-slate-300' : 'text-slate-500 group-hover:text-white')}>
            <Settings className="h-5 w-5" />
          </span>
          {!sidebarCollapsed && (
            <>
              <span className="ml-3 flex-1 truncate">Ajustes</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', settingsOpen && 'rotate-180')} />
            </>
          )}
        </button>
        {settingsOpen && !sidebarCollapsed && (
          <div className="mt-0.5 space-y-0.5 pl-2 border-l border-white/10 ml-4">
            {settingsItems
              .filter((item) => !item.roles || !user || item.roles.includes(user.role))
              .map(renderItem)}
          </div>
        )}
        {settingsOpen && sidebarCollapsed && (
          <div className="mt-0.5 space-y-0.5">
            {settingsItems
              .filter((item) => !item.roles || !user || item.roles.includes(user.role))
              .map(renderItem)}
          </div>
        )}
      </div>

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
