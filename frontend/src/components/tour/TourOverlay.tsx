import { useEffect, useState, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useTour } from './TourProvider'
import { useNavigate } from 'react-router-dom'
import { TOURS } from './tours'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 10
const TOOLTIP_WIDTH = 340

function useElementRect(target: string | null | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!target || target === 'center') {
      setRect(null)
      return
    }

    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else {
        setRect(null)
      }
    }

    find()
    // Retry in case of animations / conditional rendering
    const t = setTimeout(find, 300)
    return () => clearTimeout(t)
  }, [target])

  return rect
}

function Spotlight({ rect }: { rect: Rect }) {
  const pad = PADDING
  return (
    <>
      {/* Top */}
      <div
        className="fixed inset-x-0 top-0 bg-black/60 z-[9998] pointer-events-none"
        style={{ height: Math.max(0, rect.top - pad) }}
      />
      {/* Bottom */}
      <div
        className="fixed inset-x-0 bg-black/60 z-[9998] pointer-events-none"
        style={{ top: rect.top + rect.height + pad, bottom: 0 }}
      />
      {/* Left */}
      <div
        className="fixed left-0 bg-black/60 z-[9998] pointer-events-none"
        style={{
          top: rect.top - pad,
          height: rect.height + pad * 2,
          width: Math.max(0, rect.left - pad),
        }}
      />
      {/* Right */}
      <div
        className="fixed bg-black/60 z-[9998] pointer-events-none"
        style={{
          top: rect.top - pad,
          left: rect.left + rect.width + pad,
          height: rect.height + pad * 2,
          right: 0,
        }}
      />
      {/* Highlight ring */}
      <div
        className="fixed z-[9999] rounded-xl ring-4 ring-blue-400 ring-offset-0 pointer-events-none animate-pulse"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }}
      />
    </>
  )
}

function Tooltip({
  rect,
  title,
  content,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: {
  rect: Rect | null
  title: string
  content: string
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const isLast = stepIndex === totalSteps - 1

  let top = 0
  let left = 0

  if (!rect) {
    // Center of screen
    top = vh / 2 - 120
    left = vw / 2 - TOOLTIP_WIDTH / 2
  } else {
    // Try below first
    const spaceBelow = vh - (rect.top + rect.height + PADDING)
    const spaceAbove = rect.top - PADDING

    if (spaceBelow >= 180 || spaceBelow > spaceAbove) {
      top = rect.top + rect.height + PADDING + 8
    } else {
      top = rect.top - PADDING - 180
    }

    // Horizontal: center on element, clamp to viewport
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
    left = Math.max(16, Math.min(left, vw - TOOLTIP_WIDTH - 16))
  }

  return (
    <div
      className="fixed z-[10000] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      style={{ top, left, width: TOOLTIP_WIDTH }}
    >
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-blue-200 shrink-0 mt-0.5" />
          <span className="text-white font-semibold text-sm leading-tight">{title}</span>
        </div>
        <button
          onClick={onSkip}
          className="text-blue-200 hover:text-white transition-colors shrink-0 mt-0.5"
        >
          <X size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-gray-600 text-sm leading-relaxed">{content}</p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={13} />
              Atrás
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            {isLast ? '¡Listo!' : 'Siguiente'}
            {!isLast && <ChevronRight size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// Welcome Modal
function WelcomeModal({ onClose, onStartTour }: { onClose: () => void; onStartTour: (id: string) => void }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">¡Bienvenidos a MARAL OS!</h2>
          <p className="text-blue-200 text-sm mt-2">
            La plataforma de gestión de Maral Tecnología y Comunicaciones S.A.S.
          </p>
        </div>

        <div className="p-6">
          {/* Users */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { name: 'John', emoji: '👔', role: 'Gerente', desc: 'Control general & estrategia' },
              { name: 'Wilson', emoji: '🎯', role: 'Ventas', desc: 'Clientes & cotizaciones' },
              { name: 'Iván', emoji: '⚙️', role: 'Producción', desc: 'Taller & logística' },
              { name: 'Janet', emoji: '📊', role: 'Contabilidad', desc: 'Cartera & finanzas' },
            ].map((u) => (
              <div key={u.name} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-xs">
                <div className="text-2xl mb-1">{u.emoji}</div>
                <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                <p className="text-xs text-blue-600 font-semibold">{u.role}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{u.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-600 mb-5">
            ¿Quieres que te mostremos cómo funciona cada módulo?
            Los tours duran menos de 2 minutos.
          </p>

          {/* Tour buttons */}
          <div className="space-y-2 mb-4">
            {Object.values(TOURS).map((tour) => (
              <button
                key={tour.id}
                onClick={() => {
                  onClose()
                  // Navigate to the right page first
                  const routes: Record<string, string> = {
                    dashboard: '/',
                    pedidos: '/pedidos',
                    cotizaciones: '/cotizaciones',
                    clientes: '/clientes',
                    inventario: '/inventario',
                    tareas: '/tareas',
                    gastos: '/gastos',
                  }
                  if (routes[tour.id] && routes[tour.id] !== window.location.pathname) {
                    navigate(routes[tour.id])
                    setTimeout(() => onStartTour(tour.id), 600)
                  } else {
                    onStartTour(tour.id)
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{tour.title}</span>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500" />
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Entrar sin tour, exploraré solo
          </button>
        </div>
      </div>
    </div>
  )
}

export function TourOverlay() {
  const { activeTour, currentStep, stepIndex, totalSteps, nextStep, prevStep, endTour, showWelcome, dismissWelcome, startTour } =
    useTour()

  const rect = useElementRect(currentStep?.target)

  if (showWelcome) {
    return <WelcomeModal onClose={dismissWelcome} onStartTour={startTour} />
  }

  if (!activeTour || !currentStep) return null

  const isCenter = currentStep.target === 'center'

  return (
    <>
      {/* Full overlay for center steps */}
      {isCenter && <div className="fixed inset-0 bg-black/50 z-[9998]" />}

      {/* Spotlight for targeted steps */}
      {!isCenter && rect && <Spotlight rect={rect} />}
      {!isCenter && !rect && <div className="fixed inset-0 bg-black/50 z-[9998] pointer-events-none" />}

      {/* Tooltip */}
      <Tooltip
        rect={isCenter ? null : rect}
        title={currentStep.title}
        content={currentStep.content}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={endTour}
      />
    </>
  )
}
