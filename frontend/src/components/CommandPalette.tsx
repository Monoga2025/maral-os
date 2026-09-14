import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Users, FileText, Package, X, ArrowRight, Hash } from 'lucide-react'
import { clientsApi, quotationsApi, ordersApi } from '../lib/api'
import { useUIStore } from '../store/ui'
import { formatCOP } from '../lib/utils'

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])

  // Auto-focus y reset al abrir
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 30)
      setQuery('')
    }
  }, [commandPaletteOpen])

  const enabled = query.length >= 2

  const { data: clientsRes, isFetching: loadingClients } = useQuery({
    queryKey: ['cp-clients', query],
    queryFn: () => clientsApi.getAll({ search: query, pageSize: 5 }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  })

  const { data: quotationsRes, isFetching: loadingQuotations } = useQuery({
    queryKey: ['cp-quotations', query],
    queryFn: () => quotationsApi.getAll({ search: query, pageSize: 5 }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  })

  const { data: ordersRes, isFetching: loadingOrders } = useQuery({
    queryKey: ['cp-orders', query],
    queryFn: () => ordersApi.getAll({ search: query, pageSize: 5 }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  })

  if (!commandPaletteOpen) return null

  const clients = clientsRes?.data ?? []
  const quotations = quotationsRes?.data ?? []
  const orders = ordersRes?.data ?? []
  const isLoading = loadingClients || loadingQuotations || loadingOrders
  const hasResults = clients.length > 0 || quotations.length > 0 || orders.length > 0

  const [selectedIndex, setSelectedIndex] = useState(0)

  // Items combinados para selección por teclado
  const allResults: Array<{ id: string; title: string; subtitle?: string; path: string; tag?: string; type: string }> = []
  
  if (!enabled) {
    allResults.push(
      { id: 'act-tarea', title: 'Nueva Tarea de Operaciones', subtitle: 'Crear y asignar tarea al equipo', path: '/tareas', tag: 'Acción', type: 'action' },
      { id: 'act-gasto', title: 'Registrar Gasto / Caja Menor', subtitle: 'Ingreso rápido de comprobante', path: '/gastos', tag: 'Acción', type: 'action' },
      { id: 'act-cot', title: 'Nueva Cotización', subtitle: 'Crear cotización comercial', path: '/cotizaciones/nueva', tag: 'Acción', type: 'action' },
      { id: 'nav-clientes', title: 'Clientes', subtitle: 'Directorio de clientes y prospectos', path: '/clientes', tag: 'Navegar', type: 'nav' },
      { id: 'nav-pedidos', title: 'Pedidos', subtitle: 'Órdenes de producción activas', path: '/pedidos', tag: 'Navegar', type: 'nav' },
    )
  } else {
    clients.forEach((c) => {
      allResults.push({
        id: `cli-${c.id}`,
        title: c.name,
        subtitle: [c.company, c.city].filter(Boolean).join(' · '),
        path: `/clientes/${c.id}`,
        tag: c.category?.replace('_', ' '),
        type: 'client',
      })
    })
    quotations.forEach((q) => {
      allResults.push({
        id: `cot-${q.id}`,
        title: `COT-${String(q.number).padStart(5, '0')}`,
        subtitle: q.client?.name ?? '',
        path: `/cotizaciones/${q.id}/editar`,
        tag: formatCOP(q.total),
        type: 'quotation',
      })
    })
    orders.forEach((o) => {
      allResults.push({
        id: `ped-${o.id}`,
        title: `PED-${String(o.number).padStart(5, '0')}`,
        subtitle: o.client?.name ?? '',
        path: `/pedidos/${o.id}`,
        tag: formatCOP(o.total),
        type: 'order',
      })
    })
  }

  // Keyboard navigation up/down/enter
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (allResults.length > 0 ? (prev + 1) % allResults.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (allResults.length > 0 ? (prev - 1 + allResults.length) % allResults.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allResults[selectedIndex]) {
        go(allResults[selectedIndex].path)
      }
    }
  }

  const go = (path: string) => {
    navigate(path)
    setCommandPaletteOpen(false)
    if (path === '/tareas') {
      setTimeout(() => window.dispatchEvent(new CustomEvent('maral:quick-new', { detail: { path: '/tareas' } })), 50)
    } else if (path === '/gastos') {
      setTimeout(() => window.dispatchEvent(new CustomEvent('maral:quick-new', { detail: { path: '/gastos' } })), 50)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clientes, cotizaciones, pedidos o escribir una acción..."
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
          <div className="flex items-center gap-2">
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              ESC
            </kbd>
          </div>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!enabled ? (
            /* Estado inicial — accesos directos */
            <div className="py-3 px-2">
              <p className="text-[11px] font-semibold text-gray-400 px-3 py-1.5 uppercase tracking-wider">
                Acciones Rápidas & Accesos
              </p>
              <div className="space-y-1">
                {allResults.map((item, idx) => {
                  const isSelected = selectedIndex === idx
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.path)}
                      className={`flex w-full items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                        isSelected ? 'bg-blue-50/90 text-blue-900 ring-1 ring-blue-500/20' : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {item.title}
                        </p>
                        {item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-blue-200/60 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.tag}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : isLoading && !hasResults ? (
            <div className="py-10 text-center text-sm text-gray-400">Buscando...</div>
          ) : !hasResults ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-gray-500">Sin resultados para "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Intenta con otro término</p>
            </div>
          ) : (
            <div className="py-1">
              {allResults.map((res, idx) => {
                const isSelected = selectedIndex === idx
                return (
                  <ResultRow
                    key={res.id}
                    onClick={() => go(res.path)}
                    primary={res.title}
                    secondary={res.subtitle}
                    tag={res.tag}
                    isSelected={isSelected}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2.5 bg-slate-50/60">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Hash className="h-3 w-3" /> Búsqueda en tiempo real
          </span>
          <span className="ml-auto text-[11px] text-gray-500 font-medium">
            <kbd className="rounded bg-white border border-gray-200 px-1 py-0.5 text-[10px] shadow-xs">↑↓</kbd> navegar ·{' '}
            <kbd className="rounded bg-white border border-gray-200 px-1 py-0.5 text-[10px] shadow-xs">Enter</kbd> abrir ·{' '}
            <kbd className="rounded bg-white border border-gray-200 px-1 py-0.5 text-[10px] shadow-xs">ESC</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  )
}

function ResultRow({
  onClick,
  primary,
  secondary,
  tag,
  isSelected,
}: {
  onClick: () => void
  primary: string
  secondary?: string
  tag?: string
  isSelected?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
        isSelected ? 'bg-blue-50/90 text-blue-900' : 'hover:bg-slate-50 text-gray-900'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
          {primary}
        </p>
        {secondary && <p className="text-xs text-gray-500 truncate">{secondary}</p>}
      </div>
      {tag && (
        <span className={`text-xs shrink-0 ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
          {tag}
        </span>
      )}
      <ArrowRight className={`h-3.5 w-3.5 transition-colors shrink-0 ${
        isSelected ? 'text-blue-600 translate-x-0.5' : 'text-gray-300 group-hover:text-blue-500'
      }`} />
    </button>
  )
}
