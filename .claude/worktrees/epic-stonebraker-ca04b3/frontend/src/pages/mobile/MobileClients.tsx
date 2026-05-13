import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { clientsApi } from '../../lib/api'
import type { ClientCategory } from '../../types'

const CATEGORY_LABELS: Record<ClientCategory, string> = {
  FUNDADOR_HISTORICO: 'Fundador H.',
  FUNDADOR_MARAL: 'Fundador M.',
  ALIADO: 'Aliado',
  PROSPECTO: 'Prospecto',
  IMPORTADOR: 'IM',
  DISTRIBUIDOR: 'DS',
  CLIENTE_FINAL: 'CF',
}

const CATEGORY_COLORS: Record<ClientCategory, string> = {
  FUNDADOR_HISTORICO: 'bg-red-900 text-red-300',
  FUNDADOR_MARAL: 'bg-blue-900 text-blue-300',
  ALIADO: 'bg-[#14532D] text-[#22C55E]',
  PROSPECTO: 'bg-yellow-900 text-yellow-300',
  IMPORTADOR: 'bg-purple-900 text-purple-300',
  DISTRIBUIDOR: 'bg-indigo-900 text-indigo-300',
  CLIENTE_FINAL: 'bg-orange-900 text-orange-300',
}

export default function MobileClients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () =>
      clientsApi
        .getAll({ search: search || undefined, pageSize: 30 })
        .then((r) => r.data),
  })

  const clients = data?.data ?? []

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <h1 className="text-[#F1F5F9] text-2xl font-bold">Clientes</h1>

      {/* Search */}
      <div className="flex items-center gap-3 bg-[#141C26] border border-[#1E2D3D] rounded-2xl px-4 py-3">
        <Search size={16} className="text-[#22C55E] shrink-0" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-[#F1F5F9] placeholder-[#475569] text-sm outline-none"
        />
      </div>

      {/* Clients list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-[#141C26] rounded-2xl p-4 border border-[#1E2D3D] animate-pulse flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#1E2D3D] shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-[#1E2D3D] rounded w-32 mb-2" />
                <div className="h-3 bg-[#1E2D3D] rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[#475569] text-sm">Sin clientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const initial = client.name[0]?.toUpperCase() ?? '?'
            return (
              <button
                key={client.id}
                onClick={() => navigate(`/clientes/${client.id}`)}
                className="w-full bg-[#141C26] rounded-2xl p-4 border border-[#1E2D3D] text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-[#14532D] border border-[#22C55E] flex items-center justify-center shrink-0">
                  <span className="text-[#22C55E] font-bold text-sm">
                    {initial}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F1F5F9] font-semibold truncate">
                    {client.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {client.company && (
                      <p className="text-[#94A3B8] text-xs truncate">
                        {client.company}
                      </p>
                    )}
                    {client.city && (
                      <p className="text-[#475569] text-xs shrink-0">
                        · {client.city}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    CATEGORY_COLORS[client.category]
                  }`}
                >
                  {CATEGORY_LABELS[client.category]}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
