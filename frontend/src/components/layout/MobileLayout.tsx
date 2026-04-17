import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  MoreHorizontal,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const TABS = [
  { path: '/', label: 'Inicio', icon: LayoutDashboard },
  { path: '/pedidos', label: 'Pedidos', icon: Package },
  { path: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/configuracion', label: 'Más', icon: MoreHorizontal },
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
  const user = useAuthStore((s) => s.user)

  const firstName = user?.name?.split(' ')[0] ?? 'Usuario'
  const initial = firstName[0]?.toUpperCase() ?? 'U'

  return (
    <div className="h-screen bg-[#0A0F14] text-[#F1F5F9] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-10 pb-4 shrink-0">
        <div>
          <p className="text-[#22C55E] text-xs font-semibold tracking-widest uppercase">
            MARAL
          </p>
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
          {TABS.map((tab) => {
            const isActive =
              tab.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(tab.path)
            const Icon = tab.icon
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 px-3 py-1 min-w-0"
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-[#22C55E]' : 'text-[#475569]'}
                />
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-[#22C55E]' : 'text-[#475569]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
