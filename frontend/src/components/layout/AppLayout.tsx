import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '../ErrorBoundary'
import ChatBot from '../ChatBot'
import { TourOverlay } from '../tour/TourOverlay'
import { CommandPalette } from '../CommandPalette'
import HotLeadsToast from '../HotLeadsToast'
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal'

export default function AppLayout() {
  const [hotCount, setHotCount] = useState(0)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let sequenceTimer: ReturnType<typeof setTimeout> | null = null
    let keyBuffer = ''

    const isInputFocused = () => {
      const active = document.activeElement
      if (!active) return false
      const tag = active.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (active as HTMLElement).isContentEditable
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (isInputFocused() || e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '?') {
        e.preventDefault()
        setShortcutsModalOpen(prev => !prev)
        return
      }

      if (e.key.toLowerCase() === 'n') {
        // Disparar evento personalizado para que la página activa lo capture si tiene acción rápida
        const handled = window.dispatchEvent(new CustomEvent('maral:quick-new', { cancelable: true, detail: { path: pathname } }))
        if (handled) {
          if (pathname.includes('/cotizaciones')) navigate('/cotizaciones/nueva')
          else if (pathname.includes('/gastos')) navigate('/gastos')
          else if (pathname.includes('/tareas')) navigate('/tareas')
        }
        return
      }

      // Secuencias de 2 teclas como 'g d', 'g t', 'c t'
      const key = e.key.toLowerCase()
      keyBuffer += key

      if (sequenceTimer) clearTimeout(sequenceTimer)
      sequenceTimer = setTimeout(() => { keyBuffer = '' }, 600)

      if (keyBuffer === 'gd') {
        navigate('/')
        keyBuffer = ''
      } else if (keyBuffer === 'gt') {
        navigate('/tareas')
        keyBuffer = ''
      } else if (keyBuffer === 'gp') {
        navigate('/pedidos')
        keyBuffer = ''
      } else if (keyBuffer === 'gc') {
        navigate('/cotizaciones')
        keyBuffer = ''
      } else if (keyBuffer === 'gg') {
        navigate('/gastos')
        keyBuffer = ''
      } else if (keyBuffer === 'ct') {
        navigate('/tareas')
        setTimeout(() => window.dispatchEvent(new CustomEvent('maral:quick-new', { detail: { path: '/tareas' } })), 50)
        keyBuffer = ''
      } else if (keyBuffer === 'cg') {
        navigate('/gastos')
        setTimeout(() => window.dispatchEvent(new CustomEvent('maral:quick-new', { detail: { path: '/gastos' } })), 50)
        keyBuffer = ''
      } else if (keyBuffer === 'cc') {
        navigate('/cotizaciones/nueva')
        keyBuffer = ''
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (sequenceTimer) clearTimeout(sequenceTimer)
    }
  }, [pathname, navigate])

  return (
    <div className="flex bg-[#F8FAFC]" style={{ height: '100dvh' }}>
      <div className="relative shrink-0">
        <Sidebar hotLeadCount={hotCount} />
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette />
      <KeyboardShortcutsModal isOpen={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
      <ChatBot />
      <TourOverlay />
      <HotLeadsToast onHotCount={setHotCount} />
    </div>
  )
}
