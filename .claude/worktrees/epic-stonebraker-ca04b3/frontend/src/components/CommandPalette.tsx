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

  const go = (path: string) => {
    navigate(path)
    setCommandPaletteOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clientes, cotizaciones, pedidos..."
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
            <div className="py-8 px-4">
              <p className="text-xs text-gray-400 mb-4 text-center">
                Escribe para buscar · mínimo 2 caracteres
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Clientes', path: '/clientes', icon: <Users className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Cotizaciones', path: '/cotizaciones', icon: <FileText className="h-5 w-5" />, color: 'text-purple-600 bg-purple-50' },
                  { label: 'Pedidos', path: '/pedidos', icon: <Package className="h-5 w-5" />, color: 'text-orange-600 bg-orange-50' },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className="flex flex-col items-center gap-2 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                      {item.icon}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                  </button>
                ))}
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
              {clients.length > 0 && (
                <Section icon={<Users className="h-3.5 w-3.5" />} label="Clientes">
                  {clients.map((c) => (
                    <ResultRow
                      key={c.id}
                      onClick={() => go(`/clientes/${c.id}`)}
                      primary={c.name}
                      secondary={[c.company, c.city].filter(Boolean).join(' · ')}
                      tag={c.category?.replace('_', ' ')}
                    />
                  ))}
                </Section>
              )}
              {quotations.length > 0 && (
                <Section icon={<FileText className="h-3.5 w-3.5" />} label="Cotizaciones">
                  {quotations.map((q) => (
                    <ResultRow
                      key={q.id}
                      onClick={() => go(`/cotizaciones/${q.id}/editar`)}
                      primary={`COT-${String(q.number).padStart(5, '0')}`}
                      secondary={q.client?.name ?? ''}
                      tag={formatCOP(q.total)}
                    />
                  ))}
                </Section>
              )}
              {orders.length > 0 && (
                <Section icon={<Package className="h-3.5 w-3.5" />} label="Pedidos">
                  {orders.map((o) => (
                    <ResultRow
                      key={o.id}
                      onClick={() => go(`/pedidos/${o.id}`)}
                      primary={`PED-${String(o.number).padStart(5, '0')}`}
                      secondary={o.client?.name ?? ''}
                      tag={formatCOP(o.total)}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2.5">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Hash className="h-3 w-3" /> Número exacto de pedido/cotización
          </span>
          <span className="ml-auto text-[11px] text-gray-400">
            <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">↑↓</kbd> navegar ·{' '}
            <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">Enter</kbd> abrir
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function ResultRow({
  onClick,
  primary,
  secondary,
  tag,
}: {
  onClick: () => void
  primary: string
  secondary: string
  tag?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{primary}</p>
        {secondary && <p className="text-xs text-gray-500 truncate">{secondary}</p>}
      </div>
      {tag && (
        <span className="text-xs text-gray-400 shrink-0">{tag}</span>
      )}
      <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
    </button>
  )
}
