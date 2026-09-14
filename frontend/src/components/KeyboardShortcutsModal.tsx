import React, { useEffect } from 'react'
import { X, Command, Sparkles, Navigation, PlusCircle, Search, Keyboard } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  category: string
  icon: React.ReactNode
  shortcuts: ShortcutItem[]
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const modKey = isMac ? '⌘' : 'Ctrl'

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'Búsqueda & Navegación Global',
      icon: <Search className="w-4 h-4 text-blue-500" />,
      shortcuts: [
        { keys: [modKey, 'K'], description: 'Abrir Paleta de Comandos universal' },
        { keys: ['G', 'D'], description: 'Ir al Dashboard principal' },
        { keys: ['G', 'T'], description: 'Ir al Tablero de Tareas / Kanban' },
        { keys: ['G', 'P'], description: 'Ir al listado de Pedidos' },
        { keys: ['G', 'C'], description: 'Ir al listado de Cotizaciones' },
        { keys: ['G', 'G'], description: 'Ir a Gastos & Caja Menor' },
      ],
    },
    {
      category: 'Creación Contextual Rápida',
      icon: <PlusCircle className="w-4 h-4 text-emerald-500" />,
      shortcuts: [
        { keys: ['N'], description: 'Nuevo elemento según la vista activa (Tarea, Gasto, Pedido)' },
        { keys: ['C', 'T'], description: 'Crear nueva Tarea inmediata' },
        { keys: ['C', 'G'], description: 'Registrar nuevo Gasto / Caja Menor' },
        { keys: ['C', 'C'], description: 'Crear nueva Cotización' },
      ],
    },
    {
      category: 'Ayuda & Sistema',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      shortcuts: [
        { keys: ['?'], description: 'Abrir este panel de atajos de teclado' },
        { keys: ['ESC'], description: 'Cerrar cualquier modal o panel lateral' },
      ],
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Atajos de Teclado MARAL OS</h3>
              <p className="text-xs text-slate-500">Acelera tu flujo de trabajo sin levantar las manos del teclado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-3">
              <div className="flex items-center gap-2">
                {group.icon}
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {group.category}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 hover:bg-slate-100/80 transition-colors"
                  >
                    <span className="text-xs text-slate-700 font-medium">{sc.description}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {sc.keys.map((k, kidx) => (
                        <kbd
                          key={kidx}
                          className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-white text-slate-800 rounded-md border border-slate-200 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Pulsa <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-xs">ESC</kbd> para salir</span>
          <span className="text-[11px] text-slate-400">MARAL OS Luxury Standard</span>
        </div>
      </div>
    </div>
  )
}
