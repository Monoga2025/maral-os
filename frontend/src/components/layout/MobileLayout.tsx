import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Receipt,
  CheckSquare,
  MoreHorizontal,
  FileText,
  Users,
  Factory,
  BarChart3,
  X,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const MAIN_TABS = [
  { path: '/',             label: 'Inicio',   icon: LayoutDashboard },
  { path: '/pedidos',      label: 'Pedidos',  icon: Package },
  { path: '/gastos',       label: 'Gastos',   icon: Receipt },
  { path: '/tareas',       label: 'Tareas',   icon: CheckSquare },
]

const MORE_ITEMS = [
  { path: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { path: '/clientes',     label: 'Clientes',     icon: Users },
  { path: '/produccion',   label: 'Producción',   icon: Factory },
  { path: '/inventario',   label: 'Inventario',   icon: BarChart3 },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function MobileLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [showMore, setShowMore] = useState(false)

  const firstName = user?.name?.split(' ')[0] ?? 'Usuario'
  const initial = firstName[0]?.toUpperCase() ?? 'U'

  const isMoreActive = MORE_ITEMS.some(item => location.pathname.startsWith(item.path))

  const handleNav = (path: string) => {
    navigate(path)
    setShowMore(false)
  }

  return (
    <div className="h-screen bg-[#0A0F14] text-[#F1F5F9] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-10 pb-4 shrink-0">
        <div>
          <p className="text-[#22C55E] text-xs font-semibold tracking-widest uppercase">MARAL OS</p>
          <p className="text-[#F1F5F9] text-lg font-semibold mt-0.5">
            {getGreeting()}, {firstName}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#14532D] border border-[#22C55E] flex items-center justify-center">
          <span className="text-[#22C55E] font-bold text-sm">{initial}</span>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#141C26] border-t border-[#1E2D3D] z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {MAIN_TABS.map((tab) => {
            const isActive =
              tab.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(tab.path)
            const Icon = tab.icon
            return (
              <button
                key={tab.path}
                onClick={() => handleNav(tab.path)}
                className="flex flex-col items-center gap-1 px-3 py-1 min-w-0"
              >
                <Icon size={20} className={isActive ? 'text-[#22C55E]' : 'text-[#475569]'} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#22C55E]' : 'text-[#475569]'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}

          {/* Más button */}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center gap-1 px-3 py-1 min-w-0"
          >
            <MoreHorizontal size={20} className={isMoreActive ? 'text-[#22C55E]' : 'text-[#475569]'} />
            <span className={`text-[10px] font-medium ${isMoreActive ? 'text-[#22C55E]' : 'text-[#475569]'}`}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* More drawer */}
      {showMore && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-[#141C26] border-t border-[#1E2D3D] rounded-t-3xl z-50 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Más módulos</p>
              <button onClick={() => setShowMore(false)}>
                <X size={18} className="text-[#475569]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-[#0D2818] border-[#22C55E] text-[#22C55E]'
                        : 'bg-[#1E2D3D] border-[#2D3F50] text-[#94A3B8]'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#7F1D1D] bg-[#1A0A0A] text-red-400 text-sm font-medium"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  )
}
